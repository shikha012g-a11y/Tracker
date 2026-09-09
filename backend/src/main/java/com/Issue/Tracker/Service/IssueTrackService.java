package com.Issue.Tracker.Service;

import com.Issue.Tracker.Entity.IssueTrack;
import com.Issue.Tracker.repository.IssueTrackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class IssueTrackService {

    @Autowired
    private IssueTrackRepository repository;

    public List<IssueTrack> getAllIssues() {
        return repository.findAll();
    }

    public List<IssueTrack> filterIssues(String module, Integer month, Integer year) {
        return repository.filterIssues(module, month, year);
    }

    public IssueTrack saveIssue(IssueTrack issue) {
        return repository.save(issue);
    }

    public List<IssueTrack> saveAllIssues(List<IssueTrack> issues) {
        return repository.saveAll(issues);
    }

    public Optional<IssueTrack> getIssueById(Long id) {
        return repository.findById(id);
    }

    public IssueTrack updateIssue(Long id, IssueTrack issueDetails) {
        return repository.findById(id).map(existing -> {
            existing.setModule(issueDetails.getModule());
            existing.setEntity(issueDetails.getEntity());
            existing.setEnvironment(issueDetails.getEnvironment());
            existing.setReportedDate(issueDetails.getReportedDate());
            existing.setIssueDescription(issueDetails.getIssueDescription());
            existing.setL2Analysis(issueDetails.getL2Analysis());
            existing.setTolId(issueDetails.getTolId());
            existing.setIssueStatus(issueDetails.getIssueStatus());
            existing.setL3UpdatesRemarks(issueDetails.getL3UpdatesRemarks());
            existing.setClosureCategory(issueDetails.getClosureCategory());
            existing.setClosureDate(issueDetails.getClosureDate());
            existing.setAssignee(issueDetails.getAssignee());
            existing.setCoAssignee(issueDetails.getCoAssignee());
            existing.setL3Assignee(issueDetails.getL3Assignee());
            return repository.save(existing);
        }).orElseThrow(() -> new RuntimeException("Issue not found with ID: " + id));
    }

    public void deleteIssue(Long id) {
        repository.deleteById(id);
    }

    public void deleteAllIssues() {
        repository.deleteAll();
    }
}
