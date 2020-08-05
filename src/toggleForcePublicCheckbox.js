//
// Integrations with WooComm Memberships in Post Editor.
//

// Toggles the WooComm's Post Editor > Memberships > Force Post Public checkbox.
export function toggleForcePublicCheckbox( checked ) {
  window.onload = () => {
    const element = document.getElementById( "_wc_memberships_force_public" );
    element.checked = checked;
    toggleHideContentRestrictionsDiv( element );
  };
};

// Hides or shows WooComm's Post Editor > Memberships div when checkbox is toggled.
// Based on woocommerce-memberships/assets/js/admin/wc-memberships-admin.min.js
function toggleHideContentRestrictionsDiv( element ) {
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
