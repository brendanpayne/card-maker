import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

function CardGenerator() {
  const [name, setName] = useState('The Forbidden Move');
  const [number, setNumber] = useState(1);
  const [image, setImage] = useState('https://bit.ly/3F6LJM2');
  const [description, setDescription] = useState('If you currently possess dumb-ass dog in your hand, gain 66 koku and discard each card.');
  const [group, setGroup] = useState('᲼᲼');
  const [type, setType] = useState('active');
  const cardRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGroupChange = (event) => {
    setGroup(event.target.value);
  };

  const handleTypeChange = (event) => {
    setType(event.target.value);
  }

  const handleDownload = () => {
    html2canvas(cardRef.current).then((canvas) => {
      const link = document.createElement('a');
      link.download = (name && number) ? `${number} - ${name}.png` : 'card.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  const typeNames = {
    'pre-turn': 'Pre-Turn Card',
    'aod': 'Activate on Draw',
    'board': 'Board Card',
    'active': 'Active Card',
    'passive': 'Passive Card',
  };

  const groupNames = {
    '': '᲼᲼',
    'otto': 'Otto',
    'bushido': 'Bushido',
    'rat': 'Rat',
    'shop': 'Shop',
    'realm': `Hitler's Realm`,
    'pit': 'Pit',
    'cultist': 'Cultist',
  };

  return (
    <div className="container">
      <div className="card-container">
        <div className="card" ref={cardRef}>
          <div className="card-header">
            <h2 className={`card-name ${group}`}>{number} - {name}</h2>
            {group && <p className={`card-group ${group}`}>
              {group && <p className={`card-group ${group}`}>{groupNames[group]}</p>}
              </p>}
            {type && <p className={`card-type ${type}`}>
              {type && <p className={`card-type ${type}`}>{typeNames[type]}</p>}
            </p>}
          </div>
          <div className="card-image-container">
            {image && (
              <img className='card-image' src={image || '../public/placeholder.png'} alt={name} />
            )}
          </div>
          <p className="card-description">{description}</p>
        </div>
      </div>
      <div className="settings">
        <form onSubmit={handleSubmit}>
          <label>
            Name:
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Number:
            <input type="number" value={number} onChange={(event) => setNumber(event.target.value)} />
          </label>
          <label>
            Group:
            <select value={group} onChange={handleGroupChange}>
              <option value="᲼᲼">Basic</option>
              <option value="otto">Otto</option>
              <option value="bushido">Bushido</option>
              <option value="rat">Rat</option>
              <option value="shop">Shop</option>
              <option value="realm">Realm</option>
              <option value="pit">Pit</option>
              <option value="cultist">Cultist</option>
            </select>
          </label>
          <label>
            Type:
            <select value={type} onChange={handleTypeChange}>
              <option value="">Select a Type</option>      
              <option value="passive">Passive</option>
              <option value="active">Active</option>
              <option value="pre-turn">Pre-Turn</option>
              <option value="aod">Activate on Draw</option>
              <option value="board">Board</option>
            </select>
          </label>
          
          <label>
            Image:
            <input type="file" onChange={handleImageUpload} />
          </label>
          <label>
            Description:
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <button type='download' onClick={handleDownload}>Download your epic dog card!!</button>
        </form>
      </div>
      <div className="footer">
        <p>Made by Basbo for Sethja8's <a href='https://steamcommunity.com/sharedfiles/filedetails/?id=2919654479'>DOG GAME - A Tabletop Simulator game.</a></p>
        <p>Check out the <a href="https://github.com/brendanpayne/card-maker">source code</a>.</p>
      </div>
    </div>
  );
};

export default CardGenerator;