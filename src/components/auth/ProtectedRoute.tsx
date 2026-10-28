import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/auth';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, role, isLoading, signOut } = useAuth();
  const location = useLocation();

  // Show clean academic loading state while session and profile are validating
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-medium text-slate-500 tracking-wide uppercase">
          Verifying security credentials...
        </p>
      </div>
    );
  }

  // Not authenticated: bounce to login with return path saved
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but profile/role is still resolving, show clean loading state
  if (!role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-medium text-slate-500 tracking-wide uppercase">
          Loading user profile...
        </p>
      </div>
    );
  }

  // Role validation: if allowedRoles is provided, ensure user has permission
  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center py-8">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl text-slate-900">Access Restricted</CardTitle>
          <CardDescription className="mt-2 text-xs text-slate-600">
            Your authenticated role is <strong className="text-slate-800 capitalize font-mono">[{role}]</strong>. 
            This portal is restricted to: <strong className="text-slate-800 font-mono">[{allowedRoles.join(', ')}]</strong>.
          </CardDescription>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={role === 'faculty' ? '/teacher' : '/student'}>
              <Button variant="primary" size="sm" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Go to my {role === 'faculty' ? 'Faculty' : 'Student'} Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              className="gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
