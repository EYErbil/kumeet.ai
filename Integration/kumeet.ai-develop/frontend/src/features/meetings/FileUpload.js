import React, { useState } from 'react';

const FileUpload = () => {
    const [file, setFile] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        const formData = new FormData();
        formData.append('file', file);
        // Call the API to upload the file
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });
        // Handle response...
    };

    return (
        <div>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload Meeting File</button>
        </div>
    );
};

export default FileUpload; 