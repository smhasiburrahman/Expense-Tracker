package com.hisabnikash.api.controller;

import com.hisabnikash.api.dto.NotificationDto;
import com.hisabnikash.api.entity.User;
import com.hisabnikash.api.repository.UserRepository;
import com.hisabnikash.api.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public NotificationController(NotificationService notificationService, UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * GET /api/notifications
     * Triggers and returns alerts for:
     * 1. Over-budget events & category cap warnings (if notifyBudgetAlerts is true)
     * 2. Daily summaries of today's spending (if notifyDailySummary is true)
     * 3. Weekly reports of weekly spending trends (if notifyWeeklyReport is true)
     * 4. Saving goal milestones (if notifySavingsGoals is true)
     * 
     * Verifies the user's specific notification toggles from Settings before generating and returning alerts.
     */
    @GetMapping
    public ResponseEntity<List<NotificationDto>> getNotifications(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        List<NotificationDto> notifications = notificationService.getNotificationsForUser(user);
        return ResponseEntity.ok(notifications);
    }

    /**
     * GET /api/notifications/stream
     * Server-Sent Events stream for real-time notification push to client browsers.
     */
    @GetMapping(value = "/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamNotifications(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        return notificationService.createEmitter(user);
    }

    /**
     * POST /api/notifications/trigger-push
     * Manually triggers real-time broadcast of current alerts to connected clients.
     */
    @PostMapping("/trigger-push")
    public ResponseEntity<?> triggerPush(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        notificationService.broadcastNotifications(user.getId());
        return ResponseEntity.ok(Map.of("success", true, "message", "Real-time alerts broadcasted."));
    }

    /**
     * POST /api/notifications/mark-read
     * Marks a specific alert or set of alerts as read in database.
     */
    @PostMapping("/mark-read")
    public ResponseEntity<?> markAlertRead(@RequestBody Map<String, Object> req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);

        if (req.containsKey("alertId") && req.get("alertId") != null) {
            String alertId = req.get("alertId").toString().trim();
            notificationService.markAlertRead(user, alertId);
        } else if (req.containsKey("alertIds") && req.get("alertIds") instanceof List<?>) {
            @SuppressWarnings("unchecked")
            List<String> alertIds = (List<String>) req.get("alertIds");
            notificationService.markAllAlertsRead(user, alertIds);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "Alert(s) marked as read.");
        return ResponseEntity.ok(resp);
    }

    /**
     * POST /api/notifications/mark-all-read
     * Marks all active alerts for the user as read.
     */
    @PostMapping("/mark-all-read")
    public ResponseEntity<?> markAllAlertsRead(@RequestBody(required = false) Map<String, Object> req, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);

        List<String> alertIds = null;
        if (req != null && req.containsKey("alertIds") && req.get("alertIds") instanceof List<?>) {
            @SuppressWarnings("unchecked")
            List<String> list = (List<String>) req.get("alertIds");
            alertIds = list;
        }

        notificationService.markAllAlertsRead(user, alertIds);

        Map<String, Object> resp = new HashMap<>();
        resp.put("success", true);
        resp.put("message", "All alerts marked as read.");
        return ResponseEntity.ok(resp);
    }
}
