package com.Issue.Tracker.Controller;

import com.Issue.Tracker.Entity.IssueTrack;
import com.Issue.Tracker.Service.IssueTrackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/issues")
@CrossOrigin(origins = "*")
public class IssueTrackController {

    @Autowired
    private IssueTrackService service;

    @GetMapping
    public ResponseEntity<List<IssueTrack>> getIssues(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        
        if (module == null && month == null && year == null) {
            return ResponseEntity.ok(service.getAllIssues());
        }
        return ResponseEntity.ok(service.filterIssues(module, month, year));
    }

    @PostMapping
    public ResponseEntity<IssueTrack> createIssue(@RequestBody IssueTrack issue) {
        IssueTrack saved = service.saveIssue(issue);
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<IssueTrack>> createBatchIssues(@RequestBody List<IssueTrack> issues) {
        List<IssueTrack> savedList = service.saveAllIssues(issues);
        return ResponseEntity.ok(savedList);
    }

    @PutMapping("/{id}")
    public ResponseEntity<IssueTrack> updateIssue(
            @PathVariable Long id, 
            @RequestBody IssueTrack issueDetails) {
        IssueTrack updated = service.updateIssue(id, issueDetails);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIssue(@PathVariable Long id) {
        service.deleteIssue(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/all")
    public ResponseEntity<Void> deleteAllIssues() {
        service.deleteAllIssues();
        return ResponseEntity.noContent().build();
    }
}
