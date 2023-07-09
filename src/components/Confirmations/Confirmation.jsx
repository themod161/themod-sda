import { useState } from 'react';
import './Confirmation.css';
import ConfirmationMarket from '../ConfirmationsTypes/ConfirmationMarket/ConfirmationMarket';
import ConfirmationTrade from '../ConfirmationsTypes/ConfirmationTrade/ConfirmationTrade';
import TradeOffer from '../ConfirmationsTypes/TradeOffer/TradeOffer';
const electron = window.require('electron');

export default function Confirmation({thisConfirmation, setConfirmations}) {
    if(!thisConfirmation.title) return <></>;
    let type = thisConfirmation.title.split('-')[0].trim();
    switch (type) {
        case 'Trade Offer':
            return <ConfirmationTrade thisConfirmation={thisConfirmation} sets={setConfirmations} />
        case 'Market': 
            return <ConfirmationMarket thisConfirmation={thisConfirmation} sets={setConfirmations} />
        case 'TF':
            return <TradeOffer thisConfirmation={thisConfirmation} sets={setConfirmations} />
        default: 
            return <ConfirmationMarket thisConfirmation={thisConfirmation} sets={setConfirmations} />
    }
    return <>
        {<ConfirmationMarket thisConfirmation={thisConfirmation} sets={setConfirmations} />}
    </>
}