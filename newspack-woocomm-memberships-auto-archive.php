<?php
/**
 * Plugin Name: Newspack WooCommerce Memberships Auto-archive
 * Description: Keeps a post public for a number of days, after which it automatically becomes restricted content.
 * Version: 0.1
 * Author: Automattic
 * Author URI: https://newspack.blog/
 * License: GPL2
 *
 * @package Newspack_WooComm_Memberships_Auto_Archive
 */

if ( ! defined( 'NEWSPACK_WOOCOMM_MEMBERSHIPS_AUTO_ARCHIVE_PLUGIN_FILE' ) ) {
	define( 'NEWSPACK_WOOCOMM_MEMBERSHIPS_AUTO_ARCHIVE_PLUGIN_FILE', __FILE__ );
}

require_once ( dirname( NEWSPACK_WOOCOMM_MEMBERSHIPS_AUTO_ARCHIVE_PLUGIN_FILE ) . '/plugin/class-plugin.php' );

\Newspack_Woocomm_Memberships_Auto_Archive\Plugin::get_instance();
