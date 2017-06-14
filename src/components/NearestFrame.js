import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, css } from 'aphrodite/no-important';
import Moment from 'moment';

import HLS from './HLS';
import {cameraPath} from '../api/routes';
import Video from '../api/video';

export default class NearestFrame extends Component {
    static propTypes = {
        userSeekIndex: PropTypes.number.isRequired,
        message: PropTypes.object.isRequired,
        canFrameOffset: PropTypes.number.isRequired,
        url: PropTypes.string.isRequired,
        playing: PropTypes.bool.isRequired,
        onVideoElementAvailable: PropTypes.func
    };

    constructor(props) {
        super(props);
        this.state = {
            isLoading: false
        };

        this.onLoadStart = this.onLoadStart.bind(this);
        this.onLoadEnd = this.onLoadEnd.bind(this);
    }

    nearestFrameTime() {
        const {userSeekIndex, message, canFrameOffset} = this.props;
        const firstEntry = message.entries[0], curEntry = message.entries[userSeekIndex];
        if(firstEntry !== undefined && curEntry !== undefined) {
            const firstMsgTime = message.entries[0].time;
            const curMsgTime = message.entries[userSeekIndex].time;

            return canFrameOffset + (curMsgTime - firstMsgTime);
        } else {
            return 0;
        }
    }

    nearestFrameUrl() {
        const {url} = this.props;
        const sec = Math.round(this.nearestFrameTime());
        return cameraPath(url, sec);
    }

    loadingOverlay() {
        return (<div className={css(Styles.loadingOverlay)}>
                    <img className={css(Styles.loadingSpinner)}
                         src="/img/loading.svg"
                        />
                </div>);
    }

    onLoadStart() {
        this.setState({isLoading: true});
    }

    onLoadEnd() {
        this.setState({isLoading: false});
    }

    render() {
        return (<div className={css(Styles.root)}>
                    {this.state.isLoading ? this.loadingOverlay() : null}
                    <HLS
                         className={css(Styles.hls)}
                         source={Video.videoUrlForRouteUrl(this.props.url)}
                         startTime={this.nearestFrameTime()}
                         playbackSpeed={1}
                         onVideoElementAvailable={this.props.onVideoElementAvailable}
                         playing={this.props.playing}
                         onClick={this.props.onVideoClick}
                         onLoadStart={this.onLoadStart}
                         onLoadEnd={this.onLoadEnd} />
                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {
        borderBottomWidth: '1px',
        borderColor: 'gray',
        flex: 1,
        height: 480,
        position: 'relative'
    },
    loadingOverlay: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.5)',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3
    },
    loadingSpinner: {
        width: '25%',
        height: '25%',
        display: 'block'
    },
    img: {
        height: 480,
        display: 'block'
    },
    hls: {
        zIndex: 1
    }
});
