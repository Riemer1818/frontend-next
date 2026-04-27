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
import { ClickableTableRow } from '@/components/ui/clickable-table-row';
import { ROUTES } from '@/lib/routes';

export default function ProjectsPage() {
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8 space-y-6 bg-background min-h-screen">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <Link href={ROUTES.projects.create}>
              <Button className="bg-primary hover:bg-primary/90 text-white">
                New Project
              </Button>
            </Link>
          </div>
          <div className="flex justify-center py-12">
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-8 space-y-6 bg-background min-h-screen">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <Link href={ROUTES.projects.create}>
              <Button className="bg-primary hover:bg-primary/90 text-white">
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
      <div className="p-8 space-y-6 bg-background min-h-screen">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          </div>
          <Link href={ROUTES.projects.create}>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white">
              New Project
            </Button>
          </Link>
        </div>

        <div className="border border-border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-background">
                <TableHead className="text-foreground font-semibold">Name</TableHead>
                <TableHead className="text-foreground font-semibold">Client</TableHead>
                <TableHead className="text-foreground font-semibold">Budget</TableHead>
                <TableHead className="text-foreground font-semibold">Start Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsArray.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No projects found. Create your first project to get started.
                  </TableCell>
                </TableRow>
              ) : (
                projectsArray.map((project: any) => (
                  <ClickableTableRow
                    key={project.id}
                    href={ROUTES.projects.detail(project.id)}
                  >
                    <TableCell className="font-medium text-foreground">{project.name}</TableCell>
                    <TableCell className="text-foreground">{project.client_name || '—'}</TableCell>
                    <TableCell className="text-foreground">
                      {project.budget ? `€${Number(project.budget).toFixed(2)}` : '—'}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString() : '—'}
                    </TableCell>
                  </ClickableTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
