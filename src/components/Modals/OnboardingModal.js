import React, { Component } from "react";
import PropTypes from "prop-types";
import Moment from "moment";
import _ from "lodash";
import cx from "classnames";

import * as auth from "../../api/comma-auth";

import Modal from "../Modals/baseModal";

export default class OnboardingModal extends Component {
  static propTypes = {
    handlePandaConnect: PropTypes.func,
    routes: PropTypes.array
  };

  static instructionalImages = {
    step2: require("../../images/webusb-enable-experimental-features.png"),
    step3: require("../../images/webusb-enable-webusb.png")
  };

  constructor(props) {
    super(props);

    this.state = {
      webUsbEnabled: !!navigator.usb,
      viewingUsbInstructions: false,
      pandaConnected: false,
      chffrDrivesSearch: "",
      chffrDrivesSortBy: "start_time",
      chffrDrivesOrderDesc: true
    };

    this.attemptPandaConnection = this.attemptPandaConnection.bind(this);
    this.toggleUsbInstructions = this.toggleUsbInstructions.bind(this);
    this.handleSortDrives = this.handleSortDrives.bind(this);
    this.handleSearchDrives = this.handleSearchDrives.bind(this);
    this.navigateToAuth = this.navigateToAuth.bind(this);
    this.openChffrDrive = this.openChffrDrive.bind(this);
  }

  attemptPandaConnection() {
    if (!this.state.webUsbEnabled) {
      return;
    }
    this.props.handlePandaConnect();
  }

  toggleUsbInstructions() {
    this.setState({
      viewingUsbInstructions: !this.state.viewingUsbInstructions
    });
  }

  navigateToAuth() {
    const authUrl = auth.authUrl();
    window.location.href = authUrl;
  }

  filterRoutesWithCan(drive) {
    return drive.can === true;
  }

  handleSearchDrives(drive) {
    const { chffrDrivesSearch } = this.state;
    const searchKeywords = chffrDrivesSearch
      .split(" ")
      .filter(s => s.length > 0)
      .map(s => s.toLowerCase());

    return (
      searchKeywords.length === 0 ||
      searchKeywords.some(
        kw =>
          drive.end_geocode.toLowerCase().indexOf(kw) !== -1 ||
          drive.start_geocode.toLowerCase().indexOf(kw) !== -1 ||
          Moment(drive.start_time)
            .format("dddd MMMM Do YYYY")
            .toLowerCase()
            .indexOf(kw) !== -1 ||
          Moment(drive.end_time)
            .format("dddd MMMM Do YYYY")
            .toLowerCase()
            .indexOf(kw) !== -1
      )
    );
  }

  handleSortDrives(key) {
    if (this.state.chffrDrivesSortBy === key) {
      this.setState({ chffrDrivesOrderDesc: !this.state.chffrDrivesOrderDesc });
    } else {
      this.setState({ chffrDrivesOrderDesc: true });
      this.setState({ chffrDrivesSortBy: key });
    }
  }

  openChffrDrive(route) {
    window.location.search = `?route=${route.fullname}`;
  }

  renderPandaEligibility() {
    const { webUsbEnabled, pandaConnected } = this.state;
    const { attemptingPandaConnection } = this.props;
    if (!webUsbEnabled) {
      return (
        <p>
          <i className="fa fa-exclamation-triangle" />
          <a onClick={this.toggleUsbInstructions}>
            <span>WebUSB is not enabled in your Chrome settings</span>
          </a>
        </p>
      );
    } else if (!pandaConnected && attemptingPandaConnection) {
      return (
        <p>
          <i className="fa fa-spinner animate-spin" />
          <span className="animate-pulse-opacity">
            Waiting for panda USB connection
          </span>
        </p>
      );
    }
  }

  renderChffrOption() {
    const { routes } = this.props;
    if (routes.length > 0) {
      return (
        <div className="cabana-onboarding-mode-chffr">
          <div className="cabana-onboarding-mode-chffr-search">
            <div className="form-field--small">
              <input
                type="text"
                id="chffr_drives_search"
                placeholder="Search chffr drives"
                value={this.state.chffrDrivesSearch}
                onChange={e =>
                  this.setState({ chffrDrivesSearch: e.target.value })
                }
              />
              <div className="cabana-onboarding-mode-chffr-search-helper">
                <p>(Try: "Drives in San Francisco" or "Drives in June 2017")</p>
              </div>
            </div>
          </div>
          <div
            className={cx("cabana-onboarding-mode-chffr-header", {
              "is-ordered-desc": this.state.chffrDrivesOrderDesc,
              "is-ordered-asc": !this.state.chffrDrivesOrderDesc
            })}
          >
            <div
              className={cx("cabana-onboarding-mode-chffr-drive-date", {
                "is-sorted": this.state.chffrDrivesSortBy === "start_time"
              })}
              onClick={() => this.handleSortDrives("start_time")}
            >
              <span>Date</span>
            </div>
            <div
              className={cx("cabana-onboarding-mode-chffr-drive-places", {
                "is-sorted": this.state.chffrDrivesSortBy === "end_geocode"
              })}
              onClick={() => this.handleSortDrives("end_geocode")}
            >
              <span>Places</span>
            </div>
            <div className={cx("cabana-onboarding-mode-chffr-drive-time")}>
              <span>Time</span>
            </div>
            <div
              className={cx("cabana-onboarding-mode-chffr-drive-distance", {
                "is-sorted": this.state.chffrDrivesSortBy === "len"
              })}
              onClick={() => this.handleSortDrives("len")}
            >
              <span>Distance</span>
            </div>
            <div className="cabana-onboarding-mode-chffr-drive-action" />
          </div>
          <ul className="cabana-onboarding-mode-chffr-drives">
            {_.orderBy(
              routes,
              [this.state.chffrDrivesSortBy],
              [this.state.chffrDrivesOrderDesc ? "desc" : "asc"]
            )
              .filter(this.filterRoutesWithCan)
              .filter(this.handleSearchDrives)
              .map(route => {
                const routeDuration = Moment.duration(
                  route.end_time.diff(route.start_time)
                );
                const routeStartClock = Moment(route.start_time).format("LT");
                const routeEndClock = Moment(route.end_time).format("LT");
                return (
                  <li
                    key={route.fullname}
                    className="cabana-onboarding-mode-chffr-drive"
                  >
                    <div className="cabana-onboarding-mode-chffr-drive-date">
                      <strong>
                        {Moment(route.start_time._i).format("MMM Do")}
                      </strong>
                      <span>{Moment(route.start_time._i).format("dddd")}</span>
                    </div>
                    <div className="cabana-onboarding-mode-chffr-drive-places">
                      <strong>{route.end_geocode}</strong>
                      <span>From {route.start_geocode}</span>
                    </div>
                    <div className="cabana-onboarding-mode-chffr-drive-time">
                      <strong>
                        {routeDuration.hours > 0
                          ? `${routeDuration._data.hours} hr `
                          : null}
                        {`${routeDuration._data.minutes} min ${
                          routeDuration._data.seconds
                        } sec`}
                      </strong>
                      <span>{`${routeStartClock} - ${routeEndClock}`}</span>
                    </div>
                    <div className="cabana-onboarding-mode-chffr-drive-distance">
                      <strong>{route.len.toFixed(2)} mi</strong>
                      <span>{(route.len * 1.6).toFixed(2)} km</span>
                    </div>
                    <div className="cabana-onboarding-mode-chffr-drive-action">
                      <button
                        className="button--primary"
                        onClick={() => this.openChffrDrive(route)}
                      >
                        <span>View Drive</span>
                      </button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      );
    } else {
      return (
        <button
          onClick={this.navigateToAuth}
          className="button--primary button--kiosk"
        >
          <i className="fa fa-video-camera" />
          <strong>Log in to View Recorded Drives</strong>
          <sup>
            Analyze your car driving data from <em>chffr</em>
          </sup>
        </button>
      );
    }
  }

  renderOnboardingOptions() {
    return (
      <div className="cabana-onboarding-modes">
        <div className="cabana-onboarding-mode">{this.renderChffrOption()}</div>
        <div className="cabana-onboarding-mode">
          <button
            className={cx("button--secondary button--kiosk", {
              "is-disabled":
                !this.state.webUsbEnabled ||
                this.props.attemptingPandaConnection
            })}
            onClick={this.attemptPandaConnection}
          >
            <i className="fa fa-bolt" />
            <strong>Launch Realtime Streaming</strong>
            <sup>
              Interactively stream car data over USB with <em>panda</em>
            </sup>
            {this.renderPandaEligibility()}
          </button>
        </div>
      </div>
    );
  }

  renderUsbInstructions() {
    return (
      <div className="cabana-onboarding-instructions">
        <button
          className="button--small button--inverted"
          onClick={this.toggleUsbInstructions}
        >
          <i className="fa fa-chevron-left" />
          <span> Go back</span>
        </button>
        <h3>Follow these directions to enable WebUSB:</h3>
        <ol className="cabana-onboarding-instructions-list list--bubbled">
          <li>
            <p>
              <strong>Open your Chrome settings:</strong>
            </p>
            <div className="inset">
              <span>
                chrome://flags/#enable-experimental-web-platform-features
              </span>
            </div>
          </li>
          <li>
            <p>
              <strong>Enable Experimental Platform features:</strong>
            </p>
            <img
              alt={"Screenshot of Google Chrome Experimental Platform features"}
              src={OnboardingModal.instructionalImages.step2}
            />
          </li>
          <li>
            <p>
              <strong>Enable WebUSB:</strong>
            </p>
            <img
              alt={"Screenshot of Google Chrome enable WebUSB"}
              src={OnboardingModal.instructionalImages.step3}
            />
          </li>
          <li>
            <p>
              <strong>
                Relaunch your Chrome browser and try enabling live mode again.
              </strong>
            </p>
          </li>
        </ol>
      </div>
    );
  }

  renderModalContent() {
    if (this.state.viewingUsbInstructions) {
      return this.renderUsbInstructions();
    } else {
      return this.renderOnboardingOptions();
    }
  }

  renderModalFooter() {
    return (
      <p>
        <span>
          Don't have a{" "}
          <a
            href="https://panda.comma.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            panda
          </a>?{" "}
        </span>
        <span>
          <a
            href="https://panda.comma.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get one here
          </a>{" "}
        </span>
        <span>
          or{" "}
          <a href="https://community.comma.ai/cabana/?demo=1">try the demo</a>.
        </span>
      </p>
    );
  }

  render() {
    return (
      <Modal
        title="Welcome to cabana"
        subtitle="Get started by viewing your chffr drives or enabling live mode"
        footer={this.renderModalFooter()}
        disableClose={true}
        variations={["wide", "dark"]}
      >
        {this.renderModalContent()}
      </Modal>
    );
  }
}
