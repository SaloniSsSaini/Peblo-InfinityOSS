import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get('mine')
  @ApiOperation({ summary: 'Workspaces the current user belongs to' })
  mine(@Req() req: Request & { user: JwtUser }) {
    return this.workspaces.listMine(req.user.userId);
  }

  @Get(':workspaceId/members')
  @ApiOperation({ summary: 'Workspace members (for assignees, etc.)' })
  members(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.workspaces.listMembers(workspaceId, req.user.userId);
  }

  @Get(':workspaceId/insights')
  @ApiOperation({ summary: 'Workspace productivity rollup (notes, tasks, workload)' })
  insights(
    @Param('workspaceId') workspaceId: string,
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.workspaces.getInsights(workspaceId, req.user.userId);
  }
}
