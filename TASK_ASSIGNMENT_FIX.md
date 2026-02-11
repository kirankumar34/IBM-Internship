# Task Assignment and Status Update Fixes

## Issues Fixed

### Issue 1: Team Leaders Cannot Assign Tasks to Team Members
**Problem:** When Team Leaders tried to create tasks, the assignee dropdown was empty - no team members were available to assign.

**Root Cause:** 
- The frontend code tried to find team members by matching `teamId` or `reportsTo` fields
- However, Team Leaders in the database had no `teamId` assigned and no members reporting to them
- This caused the dropdown to be empty even though team members existed in the project

**Solution:**
- Modified `TaskBoard.jsx` (lines 73-83) to allow Team Leaders to assign tasks to **ANY team member in the project**
- This matches the backend logic which already allows TLs to assign to project members
- Simplified the logic from complex team/reporting hierarchy to simple role-based filtering

**Code Change:**
```javascript
// OLD: Complex logic checking teamId and reportsTo
if (currentRole === 'team_leader') {
    const myTeamId = user.teamId?._id || user.teamId;
    let myMembers = [];
    if (myTeamId) {
        myMembers = members.filter(m => {
            const mTeamId = m.teamId?._id || m.teamId;
            return m.role === 'team_member' && mTeamId === myTeamId;
        });
    }
    if (myMembers.length === 0) {
        myMembers = members.filter(m => m.reportsTo === currentId || m.reportsTo?._id === currentId);
    }
    // ...
}

// NEW: Simple role-based filtering
if (currentRole === 'team_leader') {
    // TL can assign to ANY team member in the project
    // Backend enforces that the user must be a project member
    const teamMembers = members.filter(m => m.role === 'team_member');
    
    if (teamMembers.length > 0) {
        return [{ label: 'Team Members', options: teamMembers }];
    }
    return [];
}
```

---

### Issue 2: Cannot Update Task Status (Mark as Done, Completed, On Hold, etc.)
**Problem:** Users assigned to tasks couldn't easily update the task status (mark as done, completed, on hold, etc.)

**Root Cause:**
- The only way to update task status was by dragging tasks between columns
- No explicit status dropdown was available in the task detail modal
- Users might not know about the drag-and-drop functionality

**Solution:**
- Added a status dropdown in the task detail modal (after the description section)
- Dropdown is only shown to:
  - **Assignees** (users assigned to the task)
  - **Superiors** (super_admin, project_manager, team_leader)
- Includes all status options: To Do, In Progress, Blocked, Completed
- When selecting "Blocked", prompts for a reason
- Added a helpful tip: "💡 You can also drag tasks between columns to update status"

**Code Change:**
```javascript
{/* Status Update Section */}
{(selectedTask.assignedTo?._id === user._id || 
  ['super_admin', 'project_manager', 'team_leader'].includes(user.role)) && (
    <section>
        <h3 className="text-xs font-bold text-dark-400 uppercase tracking-widest mb-2">Update Status</h3>
        <select
            value={selectedTask.status}
            onChange={(e) => {
                const newStatus = e.target.value;
                if (newStatus === 'Blocked') {
                    const reason = prompt('Please enter a reason for blocking this task:');
                    if (reason) {
                        updateStatus(selectedTask._id, newStatus, reason);
                    }
                } else {
                    updateStatus(selectedTask._id, newStatus);
                }
            }}
            className="w-full bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-primary transition"
        >
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Blocked">Blocked</option>
            <option value="Completed">Completed</option>
        </select>
        <p className="text-xs text-dark-500 mt-2 italic">
            💡 You can also drag tasks between columns to update status
        </p>
    </section>
)}
```

---

## Files Modified

1. **`frontend/src/components/TaskBoard.jsx`**
   - Lines 73-83: Simplified Team Leader assignment logic
   - Lines 299-328: Added status update dropdown in task detail modal

---

## Testing Verification

### Test Case 1: Team Leader Task Assignment
1. Login as Team Leader (e.g., Sanjay Kumar - tl01)
2. Navigate to a project where you're assigned as Team Lead
3. Click "New Task"
4. Check the "Assignee" dropdown
5. **Expected:** Should see all team members in the project
6. **Result:** ✅ PASS - Team members now visible

### Test Case 2: Task Status Update (Assignee)
1. Login as a Team Member
2. Navigate to a task assigned to you
3. Click on the task to open detail modal
4. Look for "Update Status" dropdown
5. **Expected:** Should see status dropdown with options
6. Change status to "In Progress"
7. **Expected:** Task should move to "In Progress" column
8. **Result:** ✅ PASS - Status updates correctly

### Test Case 3: Task Status Update (Team Leader)
1. Login as Team Leader
2. Navigate to any task in a project where you're a Team Lead
3. Click on the task to open detail modal
4. **Expected:** Should see status dropdown (even if not assigned to you)
5. Change status to "Completed"
6. **Expected:** Task should move to "Completed" column
7. **Result:** ✅ PASS - Team Leaders can update any task status

### Test Case 4: Blocked Status with Reason
1. Open any task detail modal
2. Change status to "Blocked"
3. **Expected:** Prompt should appear asking for reason
4. Enter a reason (e.g., "Waiting for API documentation")
5. **Expected:** Task should move to "Blocked" column with reason displayed
6. **Result:** ✅ PASS - Blocked reason captured and displayed

---

## Backend Validation

The backend already supports these features:
- **Task Assignment:** `taskController.js` lines 84-104 enforce assignment rules
  - Project Managers can only assign to Team Leaders
  - Team Leaders can assign to any project member (team_member role)
- **Status Updates:** `taskController.js` lines 147-153 allow:
  - Assignees to update their own tasks
  - Superiors (super_admin, project_manager, team_leader) to update any task

---

## Status
✅ **FIXED** - Both issues resolved:
1. Team Leaders can now assign tasks to team members
2. Users can update task status via dropdown (in addition to drag-and-drop)

---

**Date:** February 11, 2026  
**Time:** 20:15 IST
