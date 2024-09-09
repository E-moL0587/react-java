import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GLBViewer from './GLBViewer';

const App: React.FC = () => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('http://localhost:8080/')
      .then(response => setMessage(response.data))
      .catch(error => console.error('Error fetching message:', error));
  }, []);

  return (
    <>
      <GLBViewer />
      <h1>{message || 'Loading...'}</h1>
    </>
  );
};

export default App;
