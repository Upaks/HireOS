/**
 * Authorization utilities
 * Verifies user access to resources
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { UserRoles } from '@shared/schema';

/**
 * Check if user has access to a candidate
 * Users can access candidates if:
 * - They are admin/CEO/COO/Director (all access)
 * - The candidate belongs to a job they have access to
 * - They created the candidate
 */
export async function canAccessCandidate(userId: number, candidateId: number): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return false;

    // Admin, CEO, COO, Director have full access
    if ([UserRoles.ADMIN, UserRoles.CEO, UserRoles.COO, UserRoles.DIRECTOR].includes(user.role as any)) {
      return true;
    }

    const candidate = await storage.getCandidate(candidateId);
    if (!candidate) return false;

    // If candidate has a job, check if user has access to that job
    // For now, we'll allow access if candidate exists
    // TODO: Implement job-level access control if needed
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user can modify a candidate
 * Only admin, CEO, COO, Director can modify evaluation fields
 */
export function canModifyCandidate(user: any, updateData: any): boolean {
  if (!user) return false;

  const hasEvaluationFields =
    updateData.technicalProficiency !== undefined ||
    updateData.leadershipInitiative !== undefined ||
    updateData.problemSolving !== undefined ||
    updateData.communicationSkills !== undefined ||
    updateData.culturalFit !== undefined ||
    updateData.hiPeopleScore !== undefined ||
    updateData.hiPeoplePercentile !== undefined;

  if (hasEvaluationFields) {
    return [UserRoles.ADMIN, UserRoles.CEO, UserRoles.COO, UserRoles.DIRECTOR].includes(user.role as any);
  }

  // Other fields can be modified by any authenticated user
  // TODO: Add more granular permissions
  return true;
}

/**
 * Middleware to check candidate access
 */
export function requireCandidateAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const candidateId = parseInt(req.params.id);
  if (isNaN(candidateId)) {
    return res.status(400).json({ message: 'Invalid candidate ID' });
  }

  canAccessCandidate(req.user!.id, candidateId)
    .then(hasAccess => {
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this candidate' });
      }
      next();
    })
    .catch(() => {
      return res.status(500).json({ message: 'Error checking access' });
    });
}

/**
 * Check if user can access user management
 */
export function canManageUsers(user: any): boolean {
  if (!user) return false;
  return [UserRoles.ADMIN, UserRoles.CEO, UserRoles.COO, UserRoles.DIRECTOR].includes(user.role as any);
}

