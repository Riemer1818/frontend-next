'use client';

import { useProjects } from '@/lib/supabase/projects';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
            <Link href="/projects/create">
              <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                New Project
              </Button>
            </Link>
          </div>
          <div className="flex justify-center py-12">
            <p className="text-slate-500">Loading projects...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
            <Link href="/projects/create">
              <Button className="bg-blue-900 hover:bg-blue-800 text-white">
                New Project
              </Button>
            </Link>
          </div>
          <div className="flex justify-center py-12">
            <p className="text-red-500">Error loading projects: {error.message}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const projectsArray = projects || [];

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
          </div>
          <Link href="/projects/create">
            <Button className="bg-blue-900 hover:bg-blue-800 text-white">
              New Project
            </Button>
          </Link>
        </div>

        <div className="border border-slate-200 rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-slate-900 font-semibold">Name</TableHead>
                <TableHead className="text-slate-900 font-semibold">Client</TableHead>
                <TableHead className="text-slate-900 font-semibold">Budget</TableHead>
                <TableHead className="text-slate-900 font-semibold">Start Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsArray.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                    No projects found. Create your first project to get started.
                  </TableCell>
                </TableRow>
              ) : (
                projectsArray.map((project: any) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => window.location.href = `/projects/${project.id}`}
                  >
                    <TableCell className="font-medium text-slate-900">{project.name}</TableCell>
                    <TableCell className="text-slate-700">{project.client_name || '—'}</TableCell>
                    <TableCell className="text-slate-700">
                      {project.budget ? `€${Number(project.budget).toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
