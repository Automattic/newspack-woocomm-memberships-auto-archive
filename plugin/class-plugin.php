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

			// Here check and set the `_wc_memberships_force_public` WooComm flag, because there's a chance that it wasn't set:
			// - only Administrator users get the WC "Memberships" meta box available/visible at the bottom of the Post Editor.
			//   In case the user was not an Administrator, it will therefore not be checked. But for Auto-Archive to work well
			//   for all the User roles that get to edit posts, the checkbox does need to be set.
			wc_memberships()->get_restrictions_instance()->set_content_public( $post );

			return;
		}

		update_post_meta( $post->ID, 'newspack_woocomm_post_auto_archive', false );

		wc_memberships()->get_restrictions_instance()->unset_content_public( $post );

		$this->restrictions_update_data( $post );
	}

	/**
	 * Reset the post's restriction message to the plan default.
	 *
	 * The plan's content restriction rules need no per-post write: they apply to the post as soon as
	 * the public flag is gone.
	 *
	 * @param \WP_Post $post
	 */
	private function restrictions_update_data( $post ) {
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
}
