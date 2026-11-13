import { useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import { Footer } from './components/Footer';


const App = () => {
  const [state, setState] = useState(0);
  const [text, setText] = useState('');


  const add = () => {
    setState(state + 1);
    console.log(state);
  };
  const subtract = () => {
    setState(state - 1);
    console.log(state);
  };
  const game = () => {
    if (state === 0) {
      return 'Start the game';
    }
    return 'Game in progress';
  };

  const textchange = (e) => {
    console.log(e.target.value);
    setText(e.target.value);
  };
  // const timer = () => {
  //   setTimeout(() => {30000});

  return (
    <div>
      <Navbar/>
    
      <h1>Counter App</h1>
      <h1>Count Value: {state}</h1>
      <h2>{game()}</h2>
      <button onClick={add}>Add</button>
      <button onClick={subtract}>Subtract</button>

      <h1>Input Box</h1>
      <input onChange={textchange}/>
      <h2>{text}</h2>
      <Footer/>
      </div>
  
  )
};

export default App;