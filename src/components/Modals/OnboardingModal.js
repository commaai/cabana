import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Modal from '../Modals/baseModal';

export default class OnboardingModal extends Component {
    static propTypes = {
        handlePandaConnect: PropTypes.func,
        attemptingPandaConnection: PropTypes.bool
    };

    static instructionalImages = {
        step2: require("../../images/webusb-enable-experimental-features.png"),
        step3: require("../../images/webusb-enable-webusb.png"),
    }

    constructor(props) {
        super(props);

        this.state = {
            webUsbEnabled: !!navigator.usb,
            viewingUsbInstructions: false,
            pandaConnected: false,
            authenticatedUser: {},
            chffrDrives: [],
        }

        this.attemptPandaConnection = this.attemptPandaConnection.bind(this);
        this.toggleUsbInstructions = this.toggleUsbInstructions.bind(this);
    }

    attemptPandaConnection() {
        this.props.handlePandaConnect();
    }

    toggleUsbInstructions() {
        this.setState({ viewingUsbInstructions: !this.state.viewingUsbInstructions });
    }

    navigateToDrivingExplorer() {
        window.location.href = 'https://community.comma.ai/explorer.php';
    }

    renderPandaEligibility() {
        const { webUsbEnabled, pandaConnected } = this.state;
        const { attemptingPandaConnection } = this.props;
        if (!webUsbEnabled) {
            return (
                <p>
                    <i className='fa fa-exclamation-triangle'></i>
                    <a onClick={ this.toggleUsbInstructions }>
                        <span>WebUSB is not enabled in your Chrome settings</span>
                    </a>
                </p>
            )
        }
        else if (!pandaConnected && attemptingPandaConnection) {
            return (
                <p>
                    <i className='fa fa-spinner animate-spin'></i>
                    <span className='animate-pulse-opacity'>Waiting for panda USB connection</span>
                </p>
            )
        }
    }

    renderOnboardingOptions() {
        return (
            <div className='cabana-onboarding-modes'>
                <div className='cabana-onboarding-mode'>
                    <button onClick={ this.navigateToDrivingExplorer }
                        className='button--primary button--kiosk'>
                        <i className='fa fa-video-camera'></i>
                        <strong>Load Drive From chffr</strong>
                        <sup>Click <em>[cabana]</em> from a drive in your driving explorer</sup>
                    </button>
                </div>
                <div className='cabana-onboarding-mode'>
                    <button className='button--secondary button--kiosk'
                            onClick={ this.attemptPandaConnection }
                            disabled={ !this.state.webUsbEnabled || this.props.attemptingPandaConnection }>
                        <i className='fa fa-bolt'></i>
                        <strong>Launch Realtime Streaming</strong>
                        <sup>Interactively stream car data over USB with <em>panda</em></sup>
                        { this.renderPandaEligibility() }
                    </button>
                </div>
            </div>
        )
    }

    renderUsbInstructions() {
        return (
            <div className='cabana-onboarding-instructions'>
                <button className='button--small button--inverted' onClick={ this.toggleUsbInstructions }>
                    <i className='fa fa-chevron-left'></i>
                    <span> Go back</span>
                </button>
                <h3>Follow these directions to enable WebUSB:</h3>
                <ol className='cabana-onboarding-instructions-list list--bubbled'>
                    <li>
                        <p><strong>Open your Chrome settings:</strong></p>
                        <div className='inset'>
                            <span>chrome://flags/#enable-experimental-web-platform-features</span>
                        </div>
                    </li>
                    <li>
                        <p><strong>Enable Experimental Platform features:</strong></p>
                        <img alt={"Screenshot of Google Chrome Experimental Platform features"}
                             src={ OnboardingModal.instructionalImages.step2 } />
                    </li>
                    <li>
                        <p><strong>Enable WebUSB:</strong></p>
                        <img alt={"Screenshot of Google Chrome enable WebUSB"}
                             src={ OnboardingModal.instructionalImages.step3 } />
                    </li>
                    <li>
                        <p><strong>Relaunch your Chrome browser and try enabling live mode again.</strong></p>
                    </li>
                </ol>
            </div>
        )
    }

    renderModalContent() {
        if (this.state.viewingUsbInstructions) {
            return this.renderUsbInstructions();
        }
        else {
            return this.renderOnboardingOptions();
        }
    }

    renderModalFooter() {
        return (
            <p>
                <span>Don't have a <a href='https://panda.comma.ai' target='_blank'>panda</a>? </span>
                <span><a href='https://panda.comma.ai' target='_blank'>Get one here</a> </span>
                <span>or <a href='https://community.comma.ai/cabana/?demo=1'>try the demo</a>.</span>
            </p>
        )
    }

    render() {
        return (
            <Modal
                title='Welcome to cabana'
                subtitle='Get started by viewing your chffr drives or enabling live mode'
                footer={ this.renderModalFooter() }
                disableClose={ true }
                variations={['wide', 'dark']}>
                { this.renderModalContent() }
            </Modal>
        );
    }
}
