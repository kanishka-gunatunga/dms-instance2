/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import DashboardLayout from "@/components/DashboardLayout";
import styles from "../page.module.css";
import Heading from "@/components/common/Heading";
import {PieChart, Pie, Legend, ResponsiveContainer, Cell} from "recharts";
import InfoModal from "@/components/common/InfoModel";
import useAuth from "@/hooks/useAuth";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {useEffect, useState} from "react";
import {fetchRemindersData} from "@/utils/dataFetchFunctions";
import {Badge} from "antd";
import type {CalendarProps} from "antd";
import type {Dayjs} from "dayjs";
import StatCard from "@/components/StatCard";
import PieChartCard from "@/components/PieChartCard";
import RemindersCalendar from "@/components/RemindersCalendar";
import NearlyExpiredDocuments from "@/components/NearlyExpiredDocuments";
import MySector from "@/components/MySector";
import AssignedFiles from "@/components/AssignedFiles";
import {getWithAuth} from "@/utils/apiClient";


type Reminder = {
    id: number;
    subject: string;
    start_date_time: string | null;
};

type SelectedDate = {
    date: string;
    content: string;
    type: "success" | "processing" | "error" | "default" | "warning";
};


interface ChartDataItem {
    name: string;
    value: number;
    color: string;
}

interface DashboardData {
    total_users: number;
    total_documents: number;
    total_categories: number;
    total_sectors: number;
    documents_by_category: {
        category_name: string;
        percentage: number;
    }[];
    documents_by_sector: {
        sector_name: string;
        percentage: number;
    }[];
}


const generateRandomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;

export default function Home() {
    const isAuthenticated = useAuth();
    const data01 = [
        {
            name: "Invoice",
            value: 400,
            color: "#8884d8",
        },
        {
            name: "HR Employee fee",
            value: 300,
            color: "#888458",
        },
        {
            name: "Test Documents",
            value: 300,
            color: "#887778",
        },
    ];


    const [selectedDates, setSelectedDates] = useState<SelectedDate[]>([]);

    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [categoryChartData, setCategoryChartData] = useState<ChartDataItem[]>([]);
    const [sectorChartData, setSectorChartData] = useState<ChartDataItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response: DashboardData = await getWithAuth("admin-dashboard-data");
                setDashboardData(response);

                if (response.documents_by_category) {
                    const transformedCategoryData = response.documents_by_category
                        .filter(item => item.percentage > 0)
                        .map(item => ({
                            name: item.category_name,
                            value: Math.round(item.percentage),
                            color: generateRandomColor(),
                        }));
                    setCategoryChartData(transformedCategoryData);
                }

                if (response.documents_by_sector) {
                    const transformedSectorData = response.documents_by_sector
                        .filter(item => item.percentage > 0)
                        .map(item => ({
                            name: item.sector_name,
                            value: Math.round(item.percentage),
                            color: generateRandomColor(),
                        }));
                    setSectorChartData(transformedSectorData);
                }

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (isAuthenticated) {
            fetchDashboardData();
        }
    }, [isAuthenticated]);


    console.log("--------------", dashboardData);


    useEffect(() => {

        fetchRemindersData((data) => {
            const transformedData = data
                .filter((reminder: { start_date_time: any; }) => reminder.start_date_time)
                .map((reminder: { start_date_time: any; subject: any; }) => ({
                    date: reminder.start_date_time!.split(" ")[0],
                    content: reminder.subject,
                    type: "success",
                }));
            setSelectedDates(transformedData);
        });
    }, []);

    const getListData = (value: Dayjs) => {
        const formattedDate = value.format("YYYY-MM-DD");
        return selectedDates.filter((item) => item.date === formattedDate);
    };

    const dateCellRender = (value: Dayjs) => {
        const listData = getListData(value);
        return (
            <ul className="events">
                {listData.map((item, index) => (
                    <li key={index}>
                        <Badge status={item.type} text={item.content}/>
                    </li>
                ))}
            </ul>
        );
    };

    const cellRender: CalendarProps<Dayjs>["cellRender"] = (current, info) => {
        if (info.type === "date") return dateCellRender(current);
        return info.originNode;
    };

    const onPanelChange = (value: Dayjs, mode: CalendarProps<Dayjs>["mode"]) => {
        console.log(value.format("YYYY-MM-DD"), mode);
    };


    if (!isAuthenticated) {
        return <LoadingSpinner/>;
    }


    const categoryData = [
        {name: 'Payment Vouchers', value: 45, color: '#885AF5'},
        {name: 'Agent Files', value: 30, color: '#00B887'},
        {name: 'Personal Files', value: 25, color: '#3E7BFF'},
    ];

    const sectorData = [
        {name: 'Healthcare', value: 28, color: '#FF9E2A'},
        {name: 'Finance', value: 25, color: '#3E7BFF'},
        {name: 'Technology', value: 20, color: '#00B887'},
        {name: 'Education', value: 15, color: '#885AF5'},
        {name: 'Manufacturing', value: 12, color: '#E84A4A'},
    ];


    return (
        <div className={styles.page}>
            <DashboardLayout>
                <div
                    className="d-flex flex-column custom-scroll"
                    style={{minHeight: "100vh", maxHeight: "100%", overflowY: "scroll"}}
                >
                    <div
                        className="d-flex flex-column rounded mb-3"
                        style={{marginTop: "12px"}}
                    >
                        <div className="d-flex flex-row align-items-center justify-content-between gap-1">
                            <StatCard title="Assigned Files" value={1247} icon="/total_document.svg" changeText="+12%"
                                      changeColorClass="positiveChange"/>
                            <StatCard title="Recently Assigned" value={1247} icon="/recently_assigned.svg" changeText="+12%"
                                      changeColorClass="positiveChange"/>
                            <StatCard title="Due This Week" value={1247} icon="/due_this_week.svg" changeText="+12%"
                                      changeColorClass="positiveChange"/>
                            <StatCard title="Overdue" value={1247} icon="/warning.svg" changeText="+12%"
                                      changeColorClass="noChange"/>
                        </div>
                    </div>

                    <div className="py-4">

                        <div className="row g-4">

                            <div className="col-12 col-lg-8">
                                {/*<AssignedFiles/>*/}
                            </div>

                            <div className="col-12 col-lg-4">
                                <div className="d-flex flex-column gap-4">
                                    {/*<MySector/>*/}
                                    <PieChartCard
                                        title="Documents by Category"
                                        icon="/jam_document.svg"
                                        data={categoryData}
                                    />
                                </div>
                            </div>

                        </div>
                    </div>

                    {/*<RemindersCalendar/>*/}

                    {/*<NearlyExpiredDocuments/>*/}
                </div>
            </DashboardLayout>
        </div>
    );
}
