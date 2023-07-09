import React, { useState } from 'react';
const {shell} = window.require('electron');
export function ImageWithTooltip({ mainComponentRef, TradeItemRef, index, src, alt, title }) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  
  const handleMouseEnter = () => {
    setIsTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  if(!TradeItemRef.current) return;
  const widthMain = mainComponentRef.current.getBoundingClientRect().width - 15;
  const widthItem = TradeItemRef.current.getBoundingClientRect().width;
  let last = Math.floor(widthMain / widthItem);
  return (
    <div className='item-pre-img'>
      <img
        src={src}
        alt={alt}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      {isTooltipVisible && (
        <div
          style={{
            position: 'absolute',
            bottom: '-20px',
            left: index % last == 0 ? '110%' : (index+1) % last == 0 ? '-25%' : '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            width: 'max-content',
            whiteSpace: 'break-spaces',
            overflow: 'visible',
            zIndex: 1,
          }}
        >
          {title}
        </div>
      )}
    </div>
  );
}
