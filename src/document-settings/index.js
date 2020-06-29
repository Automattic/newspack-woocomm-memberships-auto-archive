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

class WooCommPostAutoArchiveSettingsPanel extends Component {

  constructor( props ) {
    super( props );
    this.state = {
      meta: props.meta,
      minDaysToAutoArchive: 1,
      isCleanNewPost: props.isCleanNewPost,
      postPublishDate: props.postPublishDate,
      toggleWasChanged: false
    };
  }

  componentDidMount() {
    const { isCleanNewPost, meta, postPublishDate } = this.state;

    // Calculate number of days from Publish Date until tomorrow -- this is the minimum number of days we are going to allow for "days until auto-archive".
    const datePublish = new Date( postPublishDate );
    const dateNow = new Date();
    const daysFromPublish = Math.ceil( ( dateNow - datePublish ) / (1000 * 60 * 60 * 24));
    const daysFromPublishToTomorrow = daysFromPublish + 1;

    var metaUpdated = { ...meta };
    var minDaysToAutoArchive;

    // For new posts, default 7 days for Auto Archive.
    if ( isCleanNewPost ) {
      metaUpdated.newspack_woocomm_post_auto_archive = true;
      metaUpdated.newspack_woocomm_days_to_auto_archive = 7;
      minDaysToAutoArchive = 1;

      newspack_woocomm_auto_archive_toggleForcePublicCheckbox( true );
    } else {

      // If auto-archive is turned on, don't allow lowering the no.days below the minimum value (tomorrow).
      if ( metaUpdated.newspack_woocomm_post_auto_archive ) {
        minDaysToAutoArchive = metaUpdated.newspack_woocomm_days_to_auto_archive > daysFromPublishToTomorrow
          ? daysFromPublishToTomorrow
          : metaUpdated.newspack_woocomm_days_to_auto_archive;
      }

      // If not turned on, ignore any existing values -- allow known minimums.
      if ( ! metaUpdated.newspack_woocomm_post_auto_archive ) {
        metaUpdated.newspack_woocomm_days_to_auto_archive = daysFromPublishToTomorrow;
        minDaysToAutoArchive = daysFromPublishToTomorrow;
      }
    }

    this.setState({
      meta: metaUpdated,
      minDaysToAutoArchive: minDaysToAutoArchive
    });
  }

  render() {
    const { onMetaChange, isSavingPost } = this.props;
    const { minDaysToAutoArchive, meta } = this.state;
    var metaUpdated = { ...meta };

    // If Newspack Auto-Archive is on, make sure that the Membership Force Public check is also on, to prevent user/editor error.
    if ( isSavingPost && meta.newspack_woocomm_post_auto_archive ) {
      newspack_woocomm_auto_archive_toggleForcePublicCheckbox( true );
    }

    return (
      <PluginDocumentSettingPanel
        name="newspack-woocomm-auto-archive-settings-panel"
        title={ __( 'Newspack Auto Archive', 'newspack-woocomm-auto-archive' ) }
      >
        <ToggleControl
          checked={ meta.newspack_woocomm_post_auto_archive }
          onChange={ toggled => {
            metaUpdated.newspack_woocomm_post_auto_archive = toggled;
            this.setState( { meta: metaUpdated } );
            onMetaChange( metaUpdated );
          } }
          label={ __( 'Post is public but will become restricted', 'newspack-woocomm-auto-archive' ) }
        />
        <TextControl
          label={ __( 'In number of days after published:', 'newspack-woocomm-auto-archive' ) }
          onChange={ value => {
            const valueWithMinimum = value >= minDaysToAutoArchive ? value : minDaysToAutoArchive;
            metaUpdated.newspack_woocomm_days_to_auto_archive = valueWithMinimum;
            this.setState( { meta: metaUpdated } );
            onMetaChange( metaUpdated );
          } }
          value={ meta.newspack_woocomm_days_to_auto_archive }
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
      meta: meta
    };
  } ),
  withDispatch( dispatch => {
    const { editPost } = dispatch( 'core/editor' );
    return {
      onMetaChange: ( meta ) => {
        editPost( { meta: meta } );
        newspack_woocomm_auto_archive_toggleForcePublicCheckbox( meta.newspack_woocomm_post_auto_archive );
      },
    };
  } ),
] )( WooCommPostAutoArchiveSettingsPanel );

registerPlugin( 'newspack-woocomm-auto-archive-post-status-info', {
  render: WooCommPostAutoArchiveSettingsPanelWithSelect,
  icon: false,
} );
