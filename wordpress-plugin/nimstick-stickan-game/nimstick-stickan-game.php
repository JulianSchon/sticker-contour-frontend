<?php
/**
 * Plugin Name: Nimstick Stickan Game
 * Description: Embeds the "Stickan's Sticker Run" browser game via the [nimstick_game] shortcode.
 * Version: 0.1.0
 * Author: Nimstick
 */

if (!defined('ABSPATH')) {
    exit;
}

define('NIMSTICK_GAME_URL', plugin_dir_url(__FILE__));
define('NIMSTICK_GAME_PATH', plugin_dir_path(__FILE__));

/**
 * Register (but do not enqueue) the game bundle. Enqueued only when the
 * shortcode is used, so it never loads on pages without the game.
 */
function nimstick_game_register_assets() {
    $js = NIMSTICK_GAME_PATH . 'dist/nimstick-game.js';
    $css = NIMSTICK_GAME_PATH . 'dist/nimstick-game.css';
    $ver = file_exists($js) ? filemtime($js) : '0.1.0';

    wp_register_script(
        'nimstick-game',
        NIMSTICK_GAME_URL . 'dist/nimstick-game.js',
        array(),
        $ver,
        true // load in footer
    );

    if (file_exists($css)) {
        wp_register_style(
            'nimstick-game',
            NIMSTICK_GAME_URL . 'dist/nimstick-game.css',
            array(),
            $ver
        );
    }

    // Expose the asset base URL so the bundle can resolve sprites/sfx.
    wp_add_inline_script(
        'nimstick-game',
        'window.NIMSTICK_GAME_BASE = ' . wp_json_encode(NIMSTICK_GAME_URL . 'dist/') . ';',
        'before'
    );
}
add_action('init', 'nimstick_game_register_assets');

/**
 * [nimstick_game] — outputs the mount div and enqueues the bundle.
 * Optional attribute: height (CSS value, default 70vh).
 */
function nimstick_game_shortcode($atts) {
    $atts = shortcode_atts(array('height' => '70vh'), $atts, 'nimstick_game');

    wp_enqueue_script('nimstick-game');
    if (wp_style_is('nimstick-game', 'registered')) {
        wp_enqueue_style('nimstick-game');
    }

    $height = esc_attr($atts['height']);
    return '<div id="nimstick-game-root" style="width:100%;height:' . $height . ';max-width:1280px;margin:0 auto;"></div>';
}
add_shortcode('nimstick_game', 'nimstick_game_shortcode');
