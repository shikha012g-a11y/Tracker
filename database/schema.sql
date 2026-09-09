-- MySQL Schema Script for new_tracker
CREATE DATABASE IF NOT EXISTS infra_channels_db;
USE infra_channels_db;

CREATE TABLE IF NOT EXISTS tracker (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    module VARCHAR(255) NOT NULL,
    entity VARCHAR(255) NOT NULL,
    environment VARCHAR(255) NOT NULL DEFAULT 'PROD',
    reported_date DATE NOT NULL,
    issue_description TEXT NOT NULL,
    l2_analysis TEXT,
    tol_id VARCHAR(255),
    issue_status VARCHAR(255) NOT NULL,
    l3_updates_remarks TEXT,
    closure_category VARCHAR(255),
    closure_date DATE,
    assignee VARCHAR(255),
    co_assignee VARCHAR(255),
    l3_assignee VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
