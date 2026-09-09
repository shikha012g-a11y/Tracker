package com.Issue.Tracker.Entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;

@Entity
@Table(name = "tracker")
public class IssueTrack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "module", nullable = false)
    @JsonProperty("module")
    private String module;

    @Column(name = "entity", nullable = false)
    @JsonProperty("entity")
    private String entity;

    @Column(name = "environment", nullable = false)
    @JsonProperty("environment")
    private String environment = "PROD";

    @Column(name = "reported_date", nullable = false)
    @JsonProperty("reportedDate")
    private LocalDate reportedDate;

    @Column(name = "issue_description", nullable = false, columnDefinition = "TEXT")
    @JsonProperty("issueDescription")
    private String issueDescription;

    @Column(name = "l2_analysis", columnDefinition = "TEXT")
    @JsonProperty("l2Analysis")
    private String l2Analysis;

    @Column(name = "tol_id")
    @JsonProperty("tolId")
    private String tolId;

    @Column(name = "issue_status", nullable = false)
    @JsonProperty("issueStatus")
    private String issueStatus;

    @Column(name = "l3_updates_remarks", columnDefinition = "TEXT")
    @JsonProperty("l3UpdatesRemarks")
    private String l3UpdatesRemarks;

    @Column(name = "closure_date")
    @JsonProperty("closureDate")
    private LocalDate closureDate;

    @Column(name = "closure_category")
    @JsonProperty("closureCategory")
    private String closureCategory;

    @Column(name = "assignee")
    @JsonProperty("assignee")
    private String assignee;

    @Column(name = "co_assignee")
    @JsonProperty("coAssignee")
    private String coAssignee;

    @Column(name = "l3_assignee")
    @JsonProperty("l3Assignee")
    private String l3Assignee;

    public IssueTrack() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    public String getEntity() { return entity; }
    public void setEntity(String entity) { this.entity = entity; }

    public String getEnvironment() { return environment; }
    public void setEnvironment(String environment) { this.environment = environment; }

    public LocalDate getReportedDate() { return reportedDate; }
    public void setReportedDate(LocalDate reportedDate) { this.reportedDate = reportedDate; }

    public String getIssueDescription() { return issueDescription; }
    public void setIssueDescription(String issueDescription) { this.issueDescription = issueDescription; }

    public String getL2Analysis() { return l2Analysis; }
    public void setL2Analysis(String l2Analysis) { this.l2Analysis = l2Analysis; }

    public String getTolId() { return tolId; }
    public void setTolId(String tolId) { this.tolId = tolId; }

    public String getIssueStatus() { return issueStatus; }
    public void setIssueStatus(String issueStatus) { this.issueStatus = issueStatus; }

    public String getL3UpdatesRemarks() { return l3UpdatesRemarks; }
    public void setL3UpdatesRemarks(String l3UpdatesRemarks) { this.l3UpdatesRemarks = l3UpdatesRemarks; }

    public LocalDate getClosureDate() { return closureDate; }
    public void setClosureDate(LocalDate closureDate) { this.closureDate = closureDate; }

    public String getClosureCategory() { return closureCategory; }
    public void setClosureCategory(String closureCategory) { this.closureCategory = closureCategory; }

    public String getAssignee() { return assignee; }
    public void setAssignee(String assignee) { this.assignee = assignee; }

    public String getCoAssignee() { return coAssignee; }
    public void setCoAssignee(String coAssignee) { this.coAssignee = coAssignee; }

    public String getL3Assignee() { return l3Assignee; }
    public void setL3Assignee(String l3Assignee) { this.l3Assignee = l3Assignee; }
}
