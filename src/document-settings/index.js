/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { withSelect, withDispatch, subscribe } from '@wordpress/data';
import { compose } from '@wordpress/compose';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { registerPlugin } from '@wordpress/plugins';
import { ToggleControl, TextControl } from '@wordpress/components';
import { Component } from '@wordpress/element';

const AUTO_ARCHIVE_DAYS_DEFAULT = 7;

class WooCommPostAutoArchiveSettingsPanel extends Component {

  constructor( props ) {
    super( props );

    const { postPublishDate, isCleanNewPost, onMetaChange } = props;
    const minDaysToAutoArchive = this.getMinDaysToAutoArchive( postPublishDate );
    var metaUpdated = { ...props.meta };

    // The default for new posts is: Auto Archive is on, and number of days isAUTO_ARCHIVE_DAYS_DEFAULT.
    if ( isCleanNewPost ) {
      metaUpdated.newspack_woocomm_post_auto_archive = true;
      metaUpdated.newspack_woocomm_days_to_auto_archive = AUTO_ARCHIVE_DAYS_DEFAULT;
    } else {
      metaUpdated.newspack_woocomm_post_auto_archive = !! metaUpdated.newspack_woocomm_post_auto_archive;
      metaUpdated.newspack_woocomm_days_to_auto_archive = metaUpdated.newspack_woocomm_post_auto_archive
        ? metaUpdated.newspack_woocomm_days_to_auto_archive
        : ( AUTO_ARCHIVE_DAYS_DEFAULT > minDaysToAutoArchive ? AUTO_ARCHIVE_DAYS_DEFAULT : minDaysToAutoArchive );
    }

    this.state = {
      meta: metaUpdated,
      hasRunOnceDuringSaving: false,
    };
    onMetaChange( metaUpdated );
    if ( metaUpdated.newspack_woocomm_post_auto_archive ) {
      newspack_woocomm_auto_archive_toggleForcePublicCheckbox( metaUpdated.newspack_woocomm_post_auto_archive );
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { isSavingPost, postPublishDateEdited, onMetaChange } = this.props;
    const { meta } = this.state;
    const minDaysToAutoArchiveEdited = this.getMinDaysToAutoArchive( postPublishDateEdited );
    var { hasRunOnceDuringSaving } = this.state;
    var metaUpdated = { ...meta };

    if ( ! isSavingPost && hasRunOnceDuringSaving ) {
      hasRunOnceDuringSaving = false;
    }

    // Validate when Saving -- if Post is being saved with an Auto Archive date in the past, the backend will have immediately
    // updated the Post and invalidated the Post Editor, so in that case update the frontend meta, and notify the editor.
    if ( isSavingPost && ! hasRunOnceDuringSaving ) {
      hasRunOnceDuringSaving = true;
      subscribe( () => {
        if (
          metaUpdated.newspack_woocomm_post_auto_archive &&
          metaUpdated.newspack_woocomm_days_to_auto_archive < minDaysToAutoArchiveEdited
        ) {
          alert( __( 'Warning, Auto Archive was set to a date which has already passed. This Post was now updated to be Restricted to Members only.' ) )
          metaUpdated.newspack_woocomm_post_auto_archive = false;
          metaUpdated.newspack_woocomm_days_to_auto_archive = minDaysToAutoArchiveEdited;
          this.setState( { meta: metaUpdated } );
          onMetaChange( metaUpdated );
          newspack_woocomm_auto_archive_toggleForcePublicCheckbox( false );
        }
      } );
    }

    if ( hasRunOnceDuringSaving !== this.state.hasRunOnceDuringSaving ) {
      this.setState( { hasRunOnceDuringSaving } );
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
    const { postPublishDate, onMetaChange, isSavingPost } = this.props;
    const { meta } = this.state;
    const minDaysToAutoArchive = this.getMinDaysToAutoArchive( postPublishDate );
    var metaUpdated = { ...meta };

    return (
      <PluginDocumentSettingPanel
        name="newspack-woocomm-auto-archive-settings-panel"
        title={ __( 'Newspack Auto Archive', 'newspack-woocomm-auto-archive' ) }
      >
        <ToggleControl
          checked={ metaUpdated.newspack_woocomm_post_auto_archive }
          onChange={ toggled => {
            metaUpdated.newspack_woocomm_post_auto_archive = toggled;
            this.setState( { meta: metaUpdated } );
            onMetaChange( metaUpdated );
            newspack_woocomm_auto_archive_toggleForcePublicCheckbox( metaUpdated.newspack_woocomm_post_auto_archive );
          } }
          checked={ metaUpdated.newspack_woocomm_post_auto_archive }
          label={ __( 'Post is public but will become restricted', 'newspack-woocomm-auto-archive' ) }
        />
        <TextControl
          label={ __( 'Number of days after published:', 'newspack-woocomm-auto-archive' ) }
          onChange={ value => {
            metaUpdated.newspack_woocomm_days_to_auto_archive = value < minDaysToAutoArchive ? minDaysToAutoArchive : value;
            this.setState( { meta: metaUpdated } );
            onMetaChange( metaUpdated );
          } }
          value={ metaUpdated.newspack_woocomm_days_to_auto_archive }
          type="number"
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
