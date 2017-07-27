import React, { Component, PropTypes } from 'react';

export default class Modal extends Component {
    static PropTypes = {
        handleClose: PropTypes.func,
        handleSave: PropTypes.func,
        title: PropTypes.string,
        subtitle: PropTypes.string,
        navigation: PropTypes.node,
        actions: PropTypes.node,
    }

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className='cabana-modal'>
                <div className='cabana-modal-container'>
                    <div className='cabana-modal-close-icon'
                          onClick={ this.props.handleClose }></div>
                    <div className='cabana-modal-header'>
                        <h1>{ this.props.title }</h1>
                        <p>{ this.props.subtitle }</p>
                    </div>
                    <div className='cabana-modal-navigation'>
                      { this.props.navigation }
                    </div>
                    <div className='cabana-modal-body'>
                        { this.props.children }
                    </div>
                    <div className='cabana-modal-actions'>
                        { this.props.actions }
                    </div>
                </div>
                <div className='cabana-modal-backdrop'
                      onClick={ this.props.handleClose }>
                </div>
            </div>
        )
    }
}
