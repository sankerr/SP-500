import React, { Component } from 'react'

import './card.css';

interface IProps {
  style?: any
}

class Card extends Component<IProps> {
  render() {
    return (
      <div className='card container' style={ this.props.style }>
        {this.props.children}
      </div>
    )
  }
}

export default Card;