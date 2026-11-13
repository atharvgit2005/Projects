import React from 'react'
import './Navbar.css'
import { Search } from 'lucide-react';
import Logo from '../content/Black White Bold Modern Studio Logo.png';

const Navbar = () => {
  return (
    <div className='nav'>
      <div className='logo' >
        <img src={Logo} alt="Logo" style={{height:"100%",width:"100%",backgroundColor:"transparent",margin:"-50px"}}/> </div>
        <ul>
            <li>Home</li>
            <li>Menu</li>
            <li>About</li>
            <li>Contact Us</li>
        </ul>
        <div className='search-box'>
            <input type="text" placeholder='Search' />
            <button><Search style={{backgroundColor:"transparent"}}/></button>
        </div>
        </div>
  )
}

export default Navbar