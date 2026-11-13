// import { useState } from 'react';
import React from 'react';
import './App.css';
import Navbar from './components/Navbar';

function App() {
  // const [count, setCount] = useState(0)

  return (
    <div className="App">
    <Navbar/>
<h1 style={{display:'flex',justifyContent:"center"}}>
  Welcome to Wiseely the whatsapp chat assistant
  </h1>

  <div className='big-div'></div>
    </div>
  )
}

export default App;
