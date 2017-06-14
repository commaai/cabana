import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, css } from 'aphrodite/no-important';
import Moment from 'moment';

import HLS from './HLS';
import {cameraPath} from '../api/routes';
import Video from '../api/video';

export default class NearestFrame extends Component {
    static propTypes = {
        messageIndex: PropTypes.number.isRequired,
        message: PropTypes.object.isRequired,
        canFrameOffset: PropTypes.number.isRequired,
        url: PropTypes.string.isRequired,
        playing: PropTypes.bool.isRequired,
        onVideoElementAvailable: PropTypes.func
    };

    constructor(props) {
        super(props);
        this.state = {
            lastUpdatedIndex: Moment(),
            isLoading: false
        };

        this.onLoadStart = this.onLoadStart.bind(this);
        this.onLoadEnd = this.onLoadEnd.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        const now = Moment();

        if(this.props.playing
            && nextProps.messageIndex != this.props.messageIndex
            && now.diff(this.state.lastUpdatedIndex) > 500) {
            this.setState({lastUpdatedIndex: Moment()})
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        const now = Moment();
        if(nextState.isLoading != this.state.isLoading) {
            return true;
        }

        if(this.props.playing != nextProps.playing) {
            return true;
        } else if(this.props.playing) {
            // only update every 500ms if we are receiving
            // messageindex updates
            return (nextProps.messageIndex != this.props.messageIndex
                    && now.diff(this.state.lastUpdatedIndex) > 500);

        } else {
            return true;
        }
    }

    nearestFrameTime() {
        const {messageIndex, message, canFrameOffset} = this.props;

        const firstMsgTime = message.entries[0].time;
        const curMsgTime = message.entries[messageIndex].time;

        return canFrameOffset + (curMsgTime - firstMsgTime);
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
                        />}
                </div>);
    }

    onLoadStart() {
        console.log('onLoadStart')
        this.setState({isLoading: true});
    }

    onLoadEnd() {
        console.log('onLoadEnd')
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
