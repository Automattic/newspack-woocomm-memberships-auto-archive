//
// Integrations with WooComm Memberships in Post Editor.
// Toggles the WooComm's Post Editor > Memberships > Force Post Public checkbox.
// Because it works with an element by ID, it must be called when document/window is ready and not sooner.
//
export function toggleForcePublicCheckbox( checked ) {
    const element = document.getElementById( "_wc_memberships_force_public" );

    // There are WP User Roles which won't have this checkbox available/visible, in which case, don't attempt to use it.
    if ( ! element ) {
      return;
    }
    element.checked = checked;

    // Hides or shows WooComm's Post Editor > Memberships div when checkbox is toggled,
    // based on `woocommerce-memberships/assets/js/admin/wc-memberships-admin.min.js`.
    const div_js_restrictions = element.closest("p.form-field").nextElementSibling;
    if ( ! div_js_restrictions.classList.contains( 'js-restrictions' ) ) {
      return;
    }

    if ( element.checked ) {
      div_js_restrictions.classList.add( "hide" );
    } else {
      div_js_restrictions.classList.remove( "hide" );
    }
};
