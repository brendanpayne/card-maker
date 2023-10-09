import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

function CardGenerator() {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [group, setGroup] = useState('');
  const cardRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const cardName = `${number} - ${name}`;
    // Store the information in state
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

  const handleDownload = () => {
    html2canvas(cardRef.current).then((canvas) => {
      const link = document.createElement('a');
      link.download = (name && number) ? `${number} - ${name}.png` : 'card.png';
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  return (
    <div className="container">
      <div className="card-container">
        <div className="card" ref={cardRef}>
          <div className="card-header">
            <h2 className={`card-name ${group}`}>{number} - {name}</h2>
            {group && <p className={`card-group ${group}`}>{group}</p>}
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
              <option value="">Basic</option>
              <option value="otto">Otto</option>
              <option value="bushido">Bushido</option>
              <option value="rat">Rat</option>
              <option value="shop">Shop</option>
              <option value="realm">Realm</option>
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
    </div>
  );
};

export default CardGenerator;