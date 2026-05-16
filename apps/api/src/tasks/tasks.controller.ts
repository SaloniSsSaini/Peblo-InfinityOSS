import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks in workspace (JWT)' })
  list(@Query('workspaceId') workspaceId: string, @Req() req: Request & { user: JwtUser }) {
    return this.tasks.list(workspaceId, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one task (JWT)' })
  getOne(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.tasks.getOne(id, req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create task (JWT)' })
  create(
    @Query('workspaceId') workspaceId: string,
    @Req() req: Request & { user: JwtUser },
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(workspaceId, req.user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task (JWT, workspace member)' })
  patch(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtUser },
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task (JWT, workspace member)' })
  remove(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.tasks.remove(id, req.user.userId);
  }
}
