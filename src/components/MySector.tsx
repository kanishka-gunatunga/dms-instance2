import React from 'react';
import {Tag} from 'antd';
import {BsBuilding} from 'react-icons/bs';
import Image from "next/image";

// import styles from '../styles/Dashboard.module.css';


interface MySectorProps {
    sectorName: string;
    userCount: number;
    documentCount: number;
}

const MySector: React.FC<MySectorProps> = ({sectorName, userCount, documentCount}) => {
    return (
        <div className={`p-4 calendarWrapper`}>
            {/* Header */}
            <div className="d-flex align-items-center mb-3">
                <div className="sectorIconWrapper">
                    <BsBuilding/>
                </div>
                <div>
                    <h5 className="mb-0" style={{fontSize: "18px", color: "#1A1A1A"}}>My Sector</h5>
                    <small className="text-muted" style={{fontSize: "14px", color: "#6B7280"}}>Your assigned sector
                        information</small>
                </div>
            </div>

            <div className="sectorCard p-4 rounded-4">
                {/* Sector Info */}
                <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center">
                        <h4 className="fw-bold" style={{fontSize: "20px"}}>{sectorName}</h4>
                        <Tag color="#EA580C" style={{fontWeight: 600}}>Active Sector</Tag>
                    </div>
                    {/*<p className="text-muted small" style={{fontSize: "14px", color: "#6B7280"}}>*/}
                    {/*    Medical services, hospitals, and healthcare facilities*/}
                    {/*</p>*/}
                </div>

                {/* Stats */}
                <div className="row g-6">
                    <div className="col-4">
                        <div className="d-flex flex-column align-items-center">

                            <div className="d-flex gap-1">
                                <Image src="/users.svg" alt="user icon" width={18} height={18}/>
                                {/*<BsPeople className="fs-5 text-muted me-2" color="#EA580C" style={{color: "#EA580C"}}/>*/}
                                <h3 style={{fontSize: '1.125rem', fontWeight: 600}}>{userCount}</h3>
                                {/*<Statistic title="Total Users" value={156}*/}
                                {/*           valueStyle={{fontSize: '1.25rem', fontWeight: 600}}/>*/}
                            </div>
                            <p style={{fontSize: '12px', color: '#6B7280'}}>Total Users</p>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="d-flex flex-column align-items-center">

                            <div className="d-flex gap-1">
                                <Image src="/total_document.svg" alt="user icon" width={18} height={18}/>
                                <h3 style={{fontSize: '1.125rem', fontWeight: 600}}>{documentCount}</h3>
                            </div>
                            <p style={{fontSize: '12px', color: '#6B7280'}}>Documents</p>
                        </div>
                    </div>
                    <div className="col-4">
                        <div className="d-flex flex-column align-items-center">

                            <div className="d-flex gap-1">
                                <Image src="/increase.svg" alt="user icon" width={18} height={18}/>
                                <h3 style={{fontSize: '1.125rem', fontWeight: 700, color: '#00A63E'}}>2847</h3>
                            </div>
                            <p style={{fontSize: '12px', color: '#6B7280'}}>This Month</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MySector;