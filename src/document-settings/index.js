/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { withSelect, withDispatch } from '@wordpress/data';
import { compose } from '@wordpress/compose';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { registerPlugin } from '@wordpress/plugins';
import { ToggleControl, TextControl } from '@wordpress/components';
import { Component } from '@wordpress/element';
import domReady from '@wordpress/dom-ready';

/**
 * Internal dependencies
 */
import { toggleForcePublicCheckbox } from "./../toggleForcePublicCheckbox";

const AUTO_ARCHIVE_DAYS_DEFAULT = 7;

class WooCommPostAutoArchiveSettingsPanel extends Component {

  constructor( props ) {
    super( props );

    const { postPublishDate, isCleanNewPost, onMetaChange } = props;
    const minDaysToAutoArchive = this.getMinDaysToAutoArchive( postPublishDate );
    let metaPayload = { ...props.meta };

    // The default for new posts is: Auto Archive is on, and number of days isAUTO_ARCHIVE_DAYS_DEFAULT.
    if ( isCleanNewPost ) {
      metaPayload.newspack_woocomm_post_auto_archive = true;
      metaPayload.newspack_woocomm_days_to_auto_archive = AUTO_ARCHIVE_DAYS_DEFAULT;
    } else {
      metaPayload.newspack_woocomm_post_auto_archive = !! metaPayload.newspack_woocomm_post_auto_archive;
      metaPayload.newspack_woocomm_days_to_auto_archive = metaPayload.newspack_woocomm_post_auto_archive
        ? metaPayload.newspack_woocomm_days_to_auto_archive
        : ( AUTO_ARCHIVE_DAYS_DEFAULT > minDaysToAutoArchive ? AUTO_ARCHIVE_DAYS_DEFAULT : minDaysToAutoArchive );
    }

    this.state = {
      hasRunOnceDuringSaving: false,
    };
    onMetaChange( metaPayload );
    if ( metaPayload.newspack_woocomm_post_auto_archive ) {
        domReady( function() {
          toggleForcePublicCheckbox( metaPayload.newspack_woocomm_post_auto_archive );
        } );
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { isSavingPost, postPublishDateEdited, onMetaChange, meta } = this.props;
    const { hasRunOnceDuringSaving } = this.state;
    const minDaysToAutoArchiveEdited = this.getMinDaysToAutoArchive( postPublishDateEdited );

    if ( ! isSavingPost && hasRunOnceDuringSaving ) {
      this.setState( { hasRunOnceDuringSaving: false } );
    }

    // Validate when Saving -- if Post is being saved with an Auto Archive date in the past, the backend will have immediately
    // updated the Post and invalidated the Post Editor, so in that case update the frontend meta, and notify the editor.
    if ( isSavingPost && ! hasRunOnceDuringSaving ) {
      this.setState( { hasRunOnceDuringSaving: true } );
      if (
        meta.newspack_woocomm_post_auto_archive &&
        meta.newspack_woocomm_days_to_auto_archive < minDaysToAutoArchiveEdited
      ) {
        alert( __( 'Warning, Auto Archive was set to a date which has already passed. This Post was now updated to be Restricted to Members only.' ) )
        onMetaChange( {
          newspack_woocomm_post_auto_archive: false,
          newspack_woocomm_days_to_auto_archive: minDaysToAutoArchiveEdited,
        } );
        toggleForcePublicCheckbox( false );
      }
    }
  }

  // The minimum number of days to Auto Archive makes sure that the date is not set in the past.
  getMinDaysToAutoArchive( postPublishDate ) {
    const datePublish = new Date( postPublishDate );
    const dateNow = new Date();
    const daysFromPublish = Math.floor( ( dateNow - datePublish ) / (1000 * 60 * 60 * 24) );
    const daysFromPublishToTomorrow = daysFromPublish + 1;

    return daysFromPublishToTomorrow;
  }

  render() {
    const { postPublishDate, onMetaChange, meta } = this.props;
    const minDaysToAutoArchive = this.getMinDaysToAutoArchive( postPublishDate );

    return (
      <PluginDocumentSettingPanel
        name="newspack-woocomm-auto-archive-settings-panel"
        title={ __( 'Newspack Auto Archive', 'newspack-woocomm-auto-archive' ) }
      >
        <ToggleControl
          label={ __( 'Post is public but will become restricted', 'newspack-woocomm-auto-archive' ) }
          checked={ meta.newspack_woocomm_post_auto_archive }
          onChange={ toggled => {
            onMetaChange( { newspack_woocomm_post_auto_archive: toggled } );
            toggleForcePublicCheckbox( toggled );
          } }
        />
        <TextControl
          label={ __( 'Number of days after published:', 'newspack-woocomm-auto-archive' ) }
          type="number"
          value={ meta.newspack_woocomm_days_to_auto_archive }
          onChange={ value => {
            onMetaChange( { newspack_woocomm_days_to_auto_archive: ( value < minDaysToAutoArchive ? minDaysToAutoArchive : value ) } );
          } }
        />
      </PluginDocumentSettingPanel>
    );
  }
}

const WooCommPostAutoArchiveSettingsPanelWithSelect = compose( [
  withSelect( select => {
    const { getEditedPostAttribute, isCleanNewPost, isSavingPost, getCurrentPostAttribute } = select( 'core/editor' );
    const meta = getEditedPostAttribute( 'meta' );
    return {
      isCleanNewPost: isCleanNewPost(),
      isSavingPost: isSavingPost(),
      postPublishDate: getCurrentPostAttribute( 'date' ),
      postPublishDateEdited: getEditedPostAttribute( 'date' ),
      meta: meta
    };
  } ),
  withDispatch( dispatch => {
    const { editPost } = dispatch( 'core/editor' );
    return {
      onMetaChange: ( meta ) => {
        editPost( { meta: meta } );
      },
    };
  } ),
] )( WooCommPostAutoArchiveSettingsPanel );

registerPlugin( 'newspack-woocomm-auto-archive-post-status-info', {
  render: WooCommPostAutoArchiveSettingsPanelWithSelect,
  icon: false,
} );
