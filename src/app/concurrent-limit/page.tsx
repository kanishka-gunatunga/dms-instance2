"use client";

import React from "react";
import { Result, Button } from "antd";

const ConcurrentLimitPage = () => {
  return (
    <div
      className="d-flex justify-content-center align-items-center"
      style={{ minHeight: "100vh", backgroundColor: "#F5F7FA" }}
    >
      <div
        className="p-4 p-md-5 bg-white shadow rounded text-center"
        style={{ width: "100%", maxWidth: 500 }}
      >
        <Result
          status="warning"
          title="Concurrent User Limit Reached"
          subTitle="Sorry, the maximum number of simultaneous users for this license has been reached. Please try again later or contact your administrator."
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          }
        />
      </div>
    </div>
  );
};

export default ConcurrentLimitPage;
