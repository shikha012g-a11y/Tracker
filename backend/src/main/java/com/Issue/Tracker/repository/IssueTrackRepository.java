package com.Issue.Tracker.repository;

import com.Issue.Tracker.Entity.IssueTrack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IssueTrackRepository extends JpaRepository<IssueTrack, Long> {

    @Query("""
        SELECT i FROM IssueTrack i WHERE 
        (:module IS NULL OR i.module = :module) AND 
        (:month IS NULL OR MONTH(i.reportedDate) = :month) AND 
        (:year IS NULL OR YEAR(i.reportedDate) = :year)
    """)
    List<IssueTrack> filterIssues(
            @Param("module") String module,
            @Param("month") Integer month,
            @Param("year") Integer year
    );
}
