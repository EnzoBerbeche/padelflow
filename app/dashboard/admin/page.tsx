'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Wrench, Settings, Database, Users, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useUserRole } from '@/hooks/use-user-role';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminDashboardPage() {
  const { role, loading } = useUserRole();
  const router = useRouter();

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [role, loading, router]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (role !== 'admin') {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage system settings, formats, and administrative functions
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Migrate Formats */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-600" />
              Migrate Formats
            </CardTitle>
            <CardDescription>
              Import tournament formats from JSON files to Supabase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/migrate-formats">
              <Button className="w-full">
                Go to Migration
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-600" />
              System Settings
            </CardTitle>
            <CardDescription>
              Configure global system parameters and defaults
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/settings">
              <Button className="w-full">
                Configure System
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Database Management */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-600" />
              Database Management
            </CardTitle>
            <CardDescription>
              Monitor database health and manage data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-600" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage user roles and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/users">
              <Button className="w-full">
                Manage Users
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Club Management */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cyan-600" />
              Club Management
            </CardTitle>
            <CardDescription>
              Create and manage clubs, assign to club users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/clubs">
              <Button className="w-full">
                Manage Clubs
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              System Analytics
            </CardTitle>
            <CardDescription>
              View system usage and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* Backup & Restore */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              Backup & Restore
            </CardTitle>
            <CardDescription>
              Manage system backups and data recovery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button variant="outline" size="sm">
              <Wrench className="h-4 w-4 mr-2" />
              Check System Status
            </Button>
            <Button variant="outline" size="sm">
              <Database className="h-4 w-4 mr-2" />
              Run Database Maintenance
            </Button>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              View User Logs
            </Button>
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Security Audit
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
