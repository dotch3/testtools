// backend/prisma/seed.ts
// Seeds the database with required system data:
//   - Enum types and their default values
//   - System roles (admin, lead, tester, viewer)
//   - All permissions (resource × action matrix)
//   - Default role-permission assignments
//   - Initial admin user (from ADMIN_EMAIL / ADMIN_PASSWORD env vars)
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // ── Enum types + values ───────────────────────────────────────────────────
  const enumSeed = [
    {
      name: 'test_plan_status', isSystem: true,
      values: [
        { systemKey: 'draft',     value: 'draft',     label: 'Draft',     color: '#94a3b8', isDefault: true },
        { systemKey: 'active',    value: 'active',    label: 'Active',    color: '#22c55e' },
        { systemKey: 'completed', value: 'completed', label: 'Completed', color: '#3b82f6' },
        { systemKey: 'archived',  value: 'archived',  label: 'Archived',  color: '#6b7280' },
      ],
    },
    {
      name: 'execution_status', isSystem: true,
      values: [
        { systemKey: 'not_run',  value: 'not_run',  label: 'Not Run',  color: '#94a3b8', isDefault: true },
        { systemKey: 'pass',     value: 'pass',     label: 'Pass',     color: '#22c55e' },
        { systemKey: 'fail',     value: 'fail',     label: 'Fail',     color: '#ef4444' },
        { systemKey: 'blocked',  value: 'blocked',  label: 'Blocked',  color: '#f97316' },
        { systemKey: 'skipped',  value: 'skipped',  label: 'Skipped',  color: '#a855f7' },
      ],
    },
    {
      name: 'bug_status', isSystem: true,
      values: [
        { systemKey: 'open',        value: 'open',        label: 'Open',        color: '#ef4444', isDefault: true },
        { systemKey: 'in_progress', value: 'in_progress', label: 'In Progress', color: '#f97316' },
        { systemKey: 'resolved',    value: 'resolved',    label: 'Resolved',    color: '#22c55e' },
        { systemKey: 'closed',      value: 'closed',      label: 'Closed',      color: '#6b7280' },
        { systemKey: 'reopened',    value: 'reopened',    label: 'Reopened',    color: '#a855f7' },
      ],
    },
    {
      name: 'bug_priority', isSystem: true,
      values: [
        { systemKey: 'low',      value: 'low',      label: 'Low',      color: '#22c55e', isDefault: true },
        { systemKey: 'medium',   value: 'medium',   label: 'Medium',   color: '#f59e0b' },
        { systemKey: 'high',     value: 'high',     label: 'High',     color: '#f97316' },
        { systemKey: 'critical', value: 'critical', label: 'Critical', color: '#ef4444' },
      ],
    },
    {
      name: 'bug_severity', isSystem: true,
      values: [
        { systemKey: 'trivial',  value: 'trivial',  label: 'Trivial',  color: '#94a3b8', isDefault: true },
        { systemKey: 'minor',    value: 'minor',    label: 'Minor',    color: '#22c55e' },
        { systemKey: 'major',    value: 'major',    label: 'Major',    color: '#f97316' },
        { systemKey: 'critical', value: 'critical', label: 'Critical', color: '#ef4444' },
        { systemKey: 'blocker',  value: 'blocker',  label: 'Blocker',  color: '#7c3aed' },
      ],
    },
    {
      name: 'test_priority', isSystem: true,
      values: [
        { systemKey: 'low',      value: 'low',      label: 'Low',      color: '#22c55e', isDefault: true },
        { systemKey: 'medium',   value: 'medium',   label: 'Medium',   color: '#f59e0b' },
        { systemKey: 'high',     value: 'high',     label: 'High',     color: '#f97316' },
        { systemKey: 'critical', value: 'critical', label: 'Critical', color: '#ef4444' },
      ],
    },
    {
      name: 'test_type', isSystem: true,
      values: [
        { systemKey: 'manual',       value: 'manual',       label: 'Manual',       color: '#3b82f6', isDefault: true },
        { systemKey: 'automated',    value: 'automated',    label: 'Automated',    color: '#22c55e' },
        { systemKey: 'exploratory',  value: 'exploratory',  label: 'Exploratory',  color: '#a855f7' },
        { systemKey: 'regression',   value: 'regression',   label: 'Regression',   color: '#f97316' },
      ],
    },
    {
      name: 'bug_source', isSystem: true,
      values: [
        { systemKey: 'internal', value: 'internal', label: 'Internal', color: '#6b7280', isDefault: true },
        { systemKey: 'jira',     value: 'jira',     label: 'Jira',     color: '#0052cc' },
        { systemKey: 'github',   value: 'github',   label: 'GitHub',   color: '#24292e' },
        { systemKey: 'gitlab',   value: 'gitlab',   label: 'GitLab',   color: '#fc6d26' },
        { systemKey: 'linear',   value: 'linear',   label: 'Linear',   color: '#5e6ad2' },
      ],
    },
    {
      name: 'field_type', isSystem: true,
      values: [
        { systemKey: 'text',         value: 'text',         label: 'Text',         color: '#6b7280', isDefault: true },
        { systemKey: 'number',       value: 'number',       label: 'Number',       color: '#3b82f6' },
        { systemKey: 'date',         value: 'date',         label: 'Date',         color: '#22c55e' },
        { systemKey: 'select',       value: 'select',       label: 'Select',       color: '#a855f7' },
        { systemKey: 'multi_select', value: 'multi_select', label: 'Multi Select', color: '#f97316' },
        { systemKey: 'user',         value: 'user',         label: 'User',         color: '#ec4899' },
        { systemKey: 'boolean',      value: 'boolean',      label: 'Boolean',      color: '#f59e0b' },
        { systemKey: 'url',          value: 'url',          label: 'URL',          color: '#06b6d4' },
      ],
    },
    {
      name: 'integration_type', isSystem: true,
      values: [
        { systemKey: 'jira',           value: 'jira',           label: 'Jira',            color: '#0052cc' },
        { systemKey: 'github',         value: 'github',         label: 'GitHub',          color: '#24292e' },
        { systemKey: 'gitlab',         value: 'gitlab',         label: 'GitLab',          color: '#fc6d26' },
        { systemKey: 'jenkins',        value: 'jenkins',        label: 'Jenkins',         color: '#d33833' },
        { systemKey: 'github_actions', value: 'github_actions', label: 'GitHub Actions',  color: '#2088ff' },
      ],
    },
  ]

  for (const et of enumSeed) {
    const enumType = await prisma.enumType.upsert({
      where: { name: et.name },
      create: { name: et.name, isSystem: et.isSystem },
      update: {},
    })
    for (let i = 0; i < et.values.length; i++) {
      const v = et.values[i]
      await prisma.enumValue.upsert({
        where: { id: `seed-${et.name}-${v.systemKey}` },
        create: {
          id: `seed-${et.name}-${v.systemKey}`,
          enumTypeId: enumType.id,
          systemKey: v.systemKey,
          value: v.value,
          label: v.label,
          color: v.color,
          orderIndex: i,
          isDefault: (v as any).isDefault ?? false,
          isSystem: true,
        },
        update: { label: v.label, color: v.color, orderIndex: i },
      })
    }
  }

  // ── Roles ─────────────────────────────────────────────────────────────────
  const roles = [
    { id: 'role-admin',  name: 'admin',  label: 'Admin',  color: '#ef4444', isSystem: true },
    { id: 'role-lead',   name: 'lead',   label: 'Lead',   color: '#f97316', isSystem: true },
    { id: 'role-tester', name: 'tester', label: 'Tester', color: '#3b82f6', isSystem: true },
    { id: 'role-viewer', name: 'viewer', label: 'Viewer', color: '#6b7280', isSystem: true },
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      create: role,
      update: { label: role.label, color: role.color },
    })
  }

  // ── Permissions ───────────────────────────────────────────────────────────
  const resources = ['project', 'test_plan', 'test_suite', 'test_case', 'execution',
                     'bug', 'user', 'report', 'integration', 'custom_field', 'enum',
                     'role', 'attachment']
  const actions = ['create', 'read', 'update', 'delete', 'execute', 'export', 'import',
                   'manage_members', 'manage_settings']

  const permMatrix: Array<{ resource: string; action: string; label: string }> = []
  for (const resource of resources) {
    for (const action of actions) {
      permMatrix.push({
        resource,
        action,
        label: `${action.replace('_', ' ')} ${resource.replace('_', ' ')}`,
      })
    }
  }

  for (const perm of permMatrix) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      create: perm,
      update: { label: perm.label },
    })
  }

  // Grant admin all permissions
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } })
  const allPerms = await prisma.permission.findMany()
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      create: { roleId: adminRole.id, permissionId: perm.id },
      update: {},
    })
  }

  // ── Admin user ────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@company.com'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'changeme123!'
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: 'Admin',
      roleId: adminRole.id,
      passwordHash,
      emailVerified: true,
      forcePasswordChange: true,
    },
    update: {},
  })

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
