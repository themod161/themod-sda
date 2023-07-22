import { useRef, useState } from 'react';
import './TradeItem.css';
import { ImageWithTooltip } from '../ImageWithTooltip/ImageWithTooltip';
let t = {
    "appid": 730,
    "contextid": "2",
    "assetid": "31214532078",
    "classid": "1989315734",
    "instanceid": "302028390",
    "amount": 1,
    "missing": false,
    "est_usd": "3",
    "icon_url": "IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdB2ozio1RrlIWFK3UfvMYB8UsvjiMXojflsZalyxSh31CIyHz2GZ-KuFpPsrTzBG0qeeMDmC5PzOdKXnbSwduTLIPM2uNrWX35bycQTrMErskSwlWK6dS8DUdPMyBOgx9itAdqGq0mFZwCxo8e9VKaVK5kiNCZeWTKdZyTw",
    "icon_url_large": "IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdB2ozio1RrlIWFK3UfvMYB8UsvjiMXojflsZalyxSh31CIyHz2GZ-KuFpPsrTzBG0qeeMDmDIZDbWKCSXGF9rTbRaZG_b_jPwt7-RFmqYRr4oQg8CfaQF9G0ab87YOEc73dYC-yuomUM7HRkkfddLZQOvw2QfKOAnkHZDcZMha6EX1A",
    "icon_drag_url": "",
    "name": "Sealed Graffiti | Heart (Tiger Orange)",
    "market_hash_name": "Sealed Graffiti | Heart (Tiger Orange)",
    "market_name": "Sealed Graffiti | Heart (Tiger Orange)",
    "name_color": "D2D2D2",
    "background_color": "",
    "type": "Base Grade Graffiti",
    "tradable": true,
    "marketable": true,
    "commodity": true,
    "market_tradable_restriction": 7,
    "fraudwarnings": [],
    "descriptions": [
        {
            "type": "html",
            "value": "This is a sealed container of a graffiti pattern. Once this graffiti pattern is unsealed, it will provide you with enough charges to apply the graffiti pattern <b>50</b> times to the in-game world.",
            "app_data": ""
        },
        {
            "type": "html",
            "value": " ",
            "app_data": ""
        },
        {
            "type": "html",
            "value": "",
            "color": "00a000",
            "app_data": {
                "limited": "1"
            }
        }
    ],
    "owner_descriptions": [],
    "actions": [
        {
            "name": "Inspect in Game...",
            "link": "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20S%owner_steamid%A%assetid%D9540525949185969504"
        }
    ],
    "market_actions": [
        {
            "name": "Inspect in Game...",
            "link": "steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20M%listingid%A%assetid%D9540525949185969504"
        }
    ],
    "tags": [
        {
            "internal_name": "CSGO_Type_Spray",
            "name": "Graffiti",
            "category": "Type",
            "category_name": "Type",
            "localized_tag_name": "Graffiti",
            "color": "",
            "localized_category_name": "Type"
        },
        {
            "internal_name": "normal",
            "name": "Normal",
            "category": "Quality",
            "category_name": "Category",
            "localized_tag_name": "Normal",
            "color": "",
            "localized_category_name": "Category"
        },
        {
            "internal_name": "Rarity_Common",
            "name": "Base Grade",
            "category": "Rarity",
            "color": "b0c3d9",
            "category_name": "Quality",
            "localized_tag_name": "Base Grade",
            "localized_category_name": "Quality"
        },
        {
            "internal_name": "Tint3",
            "name": "Tiger Orange",
            "category": "SprayColorCategory",
            "category_name": "Graffiti Color",
            "localized_tag_name": "Tiger Orange",
            "color": "",
            "localized_category_name": "Graffiti Color"
        }
    ],
    "id": "31214532078",
    "owner_actions": [],
    "market_marketable_restriction": 0
}
const electron = window.require('electron');
export default function TradeItem({item, index, mainComponentRef, mainComponentOpponentRef, partner, community}) {
    let TradeItemRef = useRef();
    if(!mainComponentRef && mainComponentOpponentRef) mainComponentRef = mainComponentOpponentRef;
    const openItem = () => {
        electron.shell.openExternal(`https://steamcommunity.com/profiles/${typeof partner == "string" ? partner : partner.steamID64}/inventory/#${item.appid}_${item.contextid}_${item.id}`)
    }
    return <>
        <div className={`item-inner${item.market_hash_name.toLowerCase().includes('rmr') ? ' holo-effect' : ''}`} ref={TradeItemRef} onClick={openItem}>
            {item.market_hash_name.toLowerCase().includes('rmr') ? <div className='item-inner-holo-effect'><ImageWithTooltip src={`https://steamcommunity-a.akamaihd.net/economy/image/${item.icon_url}`} alt={item.market_hash_name} title={item.market_hash_name} mainComponentRef={mainComponentRef} TradeItemRef={TradeItemRef} index={index} partner={partner} /></div> : <ImageWithTooltip src={`https://steamcommunity-a.akamaihd.net/economy/image/${item.icon_url}`} alt={item.market_hash_name} title={item.market_hash_name} mainComponentRef={mainComponentRef} TradeItemRef={TradeItemRef} index={index} partner={partner} />}
        </div>
    </>
}