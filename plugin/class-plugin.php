<?php
/**
 * Main plugin class.
 *
 * @package Newspack
 */

namespace Newspack_Woocomm_Memberships_Auto_Archive;

/**
 * Newspack WooCommerce Memberships Auto-Archive main Plugin class.
 */
class Plugin {

	/**
	 * @var Plugin|null
	 */
	private static $instance;

	/**
	 * Plugin constructor.
	 */
	private function __construct() {
		// Only register if WooComm Memberships is active.
		if ( ! is_plugin_active( 'woocommerce-memberships/woocommerce-memberships.php' ) ) {
			return;
		}

		add_action( 'init', [ $this, 'register_meta' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_block_editor_assets' ] );
		add_action( 'wp', [ $this, 'auto_archive_the_post' ], 0 );
		add_action( 'save_post', [ $this, 'remove_auto_archive_on_save_post' ] );
	}

	/**
	 * Singleton get.
	 *
	 * @return Plugin
	 */
	public static function get_instance() {
		if ( is_null( self::$instance ) ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Register post meta.
	 */
	public function register_meta() {
		\register_meta(
			'post',
			'newspack_woocomm_post_auto_archive',
			[
				'show_in_rest'  => true,
				'type'          => 'boolean',
				'single'        => true,
				'auth_callback' => '__return_true',
			]
		);
		\register_meta(
			'post',
			'newspack_woocomm_days_to_auto_archive',
			[
				'show_in_rest'  => true,
				'type'          => 'number',
				'single'        => true,
			]
		);
	}

	/**
	 * enqueue_block_editor_assets.
	 */
	public function enqueue_block_editor_assets() {

		// Only work with 'post' types.
		$screen = get_current_screen();
		if ( 'post' !== $screen->post_type ) {
			return;
		}

		\wp_enqueue_script(
			'newspack-woocomm-auto-archive',
			plugins_url( 'dist/documentSettings.js', NEWSPACK_WOOCOMM_MEMBERSHIPS_AUTO_ARCHIVE_PLUGIN_FILE ),
			[],
			filemtime( dirname( NEWSPACK_WOOCOMM_MEMBERSHIPS_AUTO_ARCHIVE_PLUGIN_FILE ) . '/dist/documentSettings.js' ),
			true
		);
		\wp_enqueue_script(
			'newspack-woocomm-memberships-enable-public-post',
			plugins_url( 'src/newspack_woocomm_auto_archive_integrations.js', NEWSPACK_WOOCOMM_MEMBERSHIPS_AUTO_ARCHIVE_PLUGIN_FILE ),
			[],
			filemtime( dirname( NEWSPACK_WOOCOMM_MEMBERSHIPS_AUTO_ARCHIVE_PLUGIN_FILE ) . '/src/newspack_woocomm_auto_archive_integrations.js' ),
			true
		);
	}

	/**
	 * Main logic for auto archiving a post. If it's due for auto-archiving, the Auto Archive Flag is unset, and
	 * WooComm Memberships Restriction Rules are enforced for this post.
	 */
	public function auto_archive_the_post() {
		global $post;
		if ( ! $post ) {
			return;
		}

		// Only archive public posts.
		if ( 'post' !== $post->post_type || 'publish' !== $post->post_status ) {
			return;
		}

		$is_set_auto_archive = (bool) get_post_meta( $post->ID, 'newspack_woocomm_post_auto_archive', true );
		if ( ! $is_set_auto_archive ) {
			return;
		}

		$days_to_auto_archive_post  = get_post_meta( $post->ID, 'newspack_woocomm_days_to_auto_archive', true );
		$date_post_published        = \DateTime::createFromFormat ( 'Y-m-d H:i:s', $post->post_date );
		$date_when_post_is_archived = $date_post_published->modify( sprintf( '+ %d days', $days_to_auto_archive_post ) );
		$date_now                   = new \DateTime();

		if ( $date_now < $date_when_post_is_archived ) {
			return;
		}

		update_post_meta( $post->ID, 'newspack_woocomm_post_auto_archive', false );

		wc_memberships()->get_restrictions_instance()->unset_content_public( $post );

		$this->restrictions_update_data( $post );
	}

	/**
	 * Update the $post with current restriction rules.
	 *
	 * Based on \WC_Memberships_Meta_Box_Post_Memberships_Data::update_data.
	 *
	 * @param \WP_Post $post
	 */
	private function restrictions_update_data( $post ) {
		$content_restriction_rules = $this->woocomm_memberships__get_content_restriction_rules( $post );

		$posted_data = [];
		foreach ( $content_restriction_rules as $rule_hash => $content_restriction_rule ) {
			if ( '__INDEX__' == $rule_hash ) {
				continue;
			}
			$posted_data[ '_content_restriction_rules' ][ $rule_hash ] = [
				'membership_plan_id' => $content_restriction_rule->get_membership_plan_id(),
				'id'                 => $content_restriction_rule->get_id(),
				'remove'             => '',
			];
		}

		require_once( wc_memberships()->get_plugin_path() . '/includes/admin/class-wc-memberships-admin-membership-plan-rules.php' );
		\WC_Memberships_Admin_Membership_Plan_Rules::save_rules( $posted_data, $post->ID, array( 'content_restriction' ), 'post' );

		wc_memberships()->get_restrictions_instance()->unset_content_public( $post );

		$message_code = \WC_Memberships_User_Messages::get_message_code_shorthand_by_post_type( $post );

		$this->woocomm_memberships__update_custom_message( $post->ID, array( $message_code ) );
	}

	/**
	 *
	 * Based on \WC_Memberships_Meta_Box::update_custom_message.
	 *
	 * @param $post_id
	 * @param $message_types
	 */
	private function woocomm_memberships__update_custom_message( $post_id, $message_types ) {
		foreach ( $message_types as $message_type ) {
			$message      = '';
			$message_code = "{$message_type}_message";
			$use_custom   = 'no';

			if ( ! empty( $_POST["_wc_memberships_{$message_code}"] ) ) {
				$message = wp_unslash( sanitize_post_field( 'post_content', $_POST["_wc_memberships_{$message_code}"], 0, 'db' ) );
			}

			if ( isset( $_POST["_wc_memberships_use_custom_{$message_code}"] ) && 'no' !== $_POST["_wc_memberships_use_custom_{$message_code}"] ) {
				$use_custom = 'yes';
			}

			\WC_Memberships_User_Messages::set_message( $message_code, $message, $post_id );

			wc_memberships_set_content_meta( $post_id, "_wc_memberships_use_custom_{$message_code}", $use_custom );
		}
	}

	/**
	 * Gets WooComm Memberships Restriction Rules.
	 *
	 * Based on \WC_Memberships_Meta_Box_Post_Memberships_Data::get_content_restriction_rules.
	 *
	 * @param \WP_Post $post
	 *
	 * @return array
	 */
	private function woocomm_memberships__get_content_restriction_rules( $post ){
		$content_restriction_rules = array();

		if ( ! ( $post instanceof \WP_Post ) ) {
			return $content_restriction_rules;
		}

		$content_restriction_rules = wc_memberships()->get_rules_instance()->get_rules( array(
			'rule_type'         => 'content_restriction',
			'object_id'         => $post->ID,
			'content_type'      => 'post_type',
			'content_type_name' => $post->post_type,
			'exclude_inherited' => false,
			'plan_status'       => 'any',
		) );

		return $content_restriction_rules;
	}

	/**
	 * Disable auto-archive when post is being saved.
	 *
	 * Since we're hooking into the 'wp' action to integrate with WooCommerce Memberships, we need to unset it for the Post Editor
	 * or otherwise the auto-archive hook could (depending on 'number of days to auto-archive') go off when the post is being
	 * saved, and invalidate the Post Editor state .
	 *
	 * @param int $post_id
	 */
	public function remove_auto_archive_on_save_post( $post_id ) {
		remove_action( 'wp', [ $this, 'auto_archive_the_post' ], 0 );
	}
}
