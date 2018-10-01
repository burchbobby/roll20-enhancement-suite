import React from "react";
import {Config} from "../src/tools/Config";

const NavBar = ({noLanding}) => {
    return (
        <nav className="navbar navbar-expand-lg navbar-light">
            <ul className="navbar-nav">

                {!noLanding &&
                <li className="nav-item">
                    <a className="nav-link" href={`${R20ES_PAGE_PREFIX}/`}>Landing</a>
                </li>
                }

                <li className="nav-item">
                    <a className="nav-link" href={`${R20ES_PAGE_PREFIX}/features.html`}>Features</a>
                </li>
                <li className="nav-item">
                    <a className="nav-link" href={`${R20ES_PAGE_PREFIX}/about.html`}>About</a>
                </li>
                <li className="nav-item">
                    <a className="nav-link" href={`${R20ES_PAGE_PREFIX}/contribute.html`}>Contribute</a>
                </li>
            </ul>
        </nav>
    )
}

export default NavBar;
