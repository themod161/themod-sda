import React from 'react';
import './ContextMenu.css';
import { CSSTransition } from 'react-transition-group';

const CustomContextMenu = ({ onMenuItemClick, items }) => {
  const handleMenuItemClick = (menuItem) => {
    onMenuItemClick(menuItem);
  };

  return (
    <CSSTransition timeout={500} classNames="context-menu-inner">
        <div
            className='nDragble nSelected context-menu-inner'
        >
            {items.map((item,i) => <div key={i} onClick={() => handleMenuItemClick(i)}>{item.text}{item.icon ? item.icon : ''}</div>)}
        </div>
    </CSSTransition>
  );
};

export default CustomContextMenu;
