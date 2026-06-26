import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="w-100 py-2 text-center" style={{ backgroundColor: 'transparent', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <p className="m-0" style={{ fontSize: '11px', color: '#6B7280', letterSpacing: '0.5px' }}>
                Digitrust powered by TNPL and Kode Tech
            </p>
        </footer>
    );
};

export default Footer;
