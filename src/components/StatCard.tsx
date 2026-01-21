import React from 'react';
import CountUp from 'react-countup';
import Image from "next/image";


interface StatCardProps {
    title: string;
    value: number;
    icon: string;
    changeText: string;
    changeColorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({title, value, icon, changeText, changeColorClass}) => {
    return (
        <div className={`col-12 col-md-6 col-lg-3 mb-3 mb-lg-0`}>
            <div className={`card statCard py-3 px-2 h-100`}>
                <div className="card-body">
                    <div className="d-flex flex-column justify-content-between">
                        <div className="d-flex flex-row justify-content-between gap-5">
                            <div>
                                <h6 className="text-muted fw-normal"
                                    style={{fontSize: "14px", color: "#717182"}}>{title}</h6>
                                <h2 className="fw-bold">
                                    <CountUp end={value} separator="," duration={1.5}/>
                                </h2>
                            </div>
                            <div className="iconWrapper">
                                <div className="icon">
                                    <Image src={icon} alt="icon" width={30} height={30}/>
                                </div>
                            </div>
                        </div>

                        <p className={`mb-0 mt-4 small`}
                           style={{marginLeft: "2px", color: "#717182", fontSize: "14px"}}>
                            <span className={`${changeColorClass}`}>{changeText}</span> from last month</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatCard;