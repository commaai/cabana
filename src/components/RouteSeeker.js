import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, css } from 'aphrodite/no-important';

import PlayButton from './PlayButton';

export default class RouteSeeker extends Component {
    static propTypes = {
        secondsLoaded: PropTypes.number.isRequired,
        startOffset: PropTypes.number.isRequired,
        segmentIndices: PropTypes.arrayOf(PropTypes.number),
        onUserSeek: PropTypes.func,
        onPlaySeek: PropTypes.func,
        video: PropTypes.node,
        onPause: PropTypes.func,
        onPlay: PropTypes.func,
        playing: PropTypes.bool
    };

    static hiddenMarkerStyle = StyleSheet.create({marker: {display: 'none', left: 0}});
    static zeroSeekedBarStyle = StyleSheet.create({seekedBar: {width: 0}});

    constructor(props) {
        super(props);
        this.state = {
            seekedBarStyle: RouteSeeker.zeroSeekedBarStyle,
            markerStyle: RouteSeeker.hiddenMarkerStyle,
            ratio: 0,
            isPlaying: false
        };

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onPlay = this.onPlay.bind(this);
        this.onPause = this.onPause.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        const {ratio} = this.state;

        if(JSON.stringify(this.props.segmentIndices)
            !== JSON.stringify(nextProps.segmentIndices)) {
            this.setState({seekedBarStyle: RouteSeeker.zeroSeekedBarStyle,
                           markerStyle: RouteSeeker.hiddenMarkerStyle,
                           ratio: 0});
        } else if(nextProps.secondsLoaded !== this.props.secondsLoaded) {
            // adjust ratio in line with new secondsLoaded
            const secondsSeeked = ratio * this.props.secondsLoaded;
            const newRatio = secondsSeeked / nextProps.secondsLoaded;
            this.updateSeekedBar(newRatio);
        }

        if(nextProps.playing && !this.state.isPlaying) {
            this.onPlay();
        } else if(!nextProps.playing && this.state.isPlaying) {
            this.onPause();
        }
    }

    componentWillUnmount() {
        window.clearInterval(this.playTimer);
    }

    mouseEventXOffsetPercent(e) {
        const rect = this.progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;

        return 100 * (x / this.progressBar.offsetWidth);
    }

    onMouseMove(e) {
        const markerOffsetPct = this.mouseEventXOffsetPercent(e);

        const markerWidth = Styles.marker._definition.width;

        const markerStyle = StyleSheet.create({
            marker: {
                display: '',
                left: `calc(${markerOffsetPct + '%'} - ${markerWidth / 2}px)`
            }
        });
        this.setState({markerStyle});
    }

    onMouseLeave(e) {
        this.setState({markerStyle: RouteSeeker.hiddenMarkerStyle});
    }

    updateSeekedBar(ratio) {
        const seekedBarStyle = StyleSheet.create({
            seekedBar: {
                width: (100 * ratio) + '%'
            }
        });
        this.setState({seekedBarStyle, ratio})
    }

    onClick(e) {
        let ratio = this.mouseEventXOffsetPercent(e) / 100;
        ratio = Math.max(0, ratio);
        this.updateSeekedBar(ratio);
        this.props.onUserSeek(ratio);
    }

    videoTimeProgress(currentTime) {
        return (currentTime - this.props.startOffset) / this.props.secondsLoaded;
    }

    onPlay() {
        window.clearInterval(this.playTimer);
        this.playTimer = window.setInterval(() => {
            const {videoElement} = this.props;
            if(videoElement === null) return;

            const {currentTime} = videoElement;
            const newRatio = this.videoTimeProgress(currentTime);

            if(newRatio >= 1) {
                window.clearInterval(this.playTimer);
                this.setState({ratio: 1})
                this.onPause();
                return;
            }
            this.updateSeekedBar(newRatio);
            this.props.onPlaySeek(newRatio);
        }, 30);
        let {ratio} = this.state;
        if(ratio >= 1) {
            ratio = 0;
        }
        this.setState({isPlaying: true, ratio});
        this.props.onPlay();
    }

    onPause() {
        window.clearInterval(this.playTimer);
        this.setState({isPlaying: false});
        this.props.onPause();
    }

    render() {
        const {seekedBarStyle, markerStyle} = this.state;
        return (<div className={css(Styles.root)}>
                    <div className={css(Styles.playButton)}>
                        <PlayButton
                            onPlay={this.onPlay}
                            onPause={this.onPause}
                            isPlaying={this.state.isPlaying}
                        />
                    </div>
                    <div className={css(Styles.progress)}>
                        <div className={css(Styles.progressBar)}
                             onMouseMove={this.onMouseMove}
                             onMouseLeave={this.onMouseLeave}
                             onClick={this.onClick}
                             ref={(ref) => this.progressBar = ref}>
                            <div className={css(Styles.marker, markerStyle.marker)}
                                 onMouseMove={(e) => e.stopPropagation()}></div>
                            <div className={css(Styles.progressBarInner,
                                                seekedBarStyle.seekedBar)}></div>
                        </div>
                    </div>
                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {
        flex: 1,
        flexDirection: 'row',
        display: 'flex',
    },
    playButton: {
        display: 'flex',
        alignSelf: 'center',
        height: 25,
        width: 25
    },
    progress: {
        display: 'flex',
        flex: 10
    },
    progressBar: {
        height: 25,
        width: '100%',
        borderColor: 'rgba(0,0,0,0.5)',
        border: 'solid 1px',
        marginTop: 10,
        marginBottom: 10,
        position: 'relative',
        zIndex: 1
    },
    progressBarInner: {
        position: 'absolute',
        height: 24,
        left: 0,
        top: 0,
        backgroundColor: 'rgba(0,0,0,0.9)',
        zIndex: 2,
    },
    marker: {
        position: 'absolute',
        width: 33,
        height: 33,
        backgroundColor: 'white',
        borderRadius: '50%',
        border: '4px solid #000',
        top: '-15%',
        zIndex: 3,
        boxShadow: '2px 2px 1px rgba(0,0,0,0.2)'
    },
});
