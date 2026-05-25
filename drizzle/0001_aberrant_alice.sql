CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`projectId` int,
	`action` varchar(128) NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`details` text,
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`productId` int,
	`description` varchar(255) NOT NULL,
	`category` varchar(128),
	`originalAmount` decimal(12,2) NOT NULL,
	`currentAmount` decimal(12,2) NOT NULL,
	`type` enum('original','change_order','credit','allowance') DEFAULT 'original',
	`changeOrderId` int,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budget_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `change_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`number` varchar(64),
	`title` varchar(255) NOT NULL,
	`description` text,
	`requestedBy` int NOT NULL,
	`status` enum('draft','pending_approval','approved','rejected') DEFAULT 'draft',
	`costImpact` decimal(12,2),
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectedReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `change_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`type` enum('spec_sheet','submittal','approval','change_order','invoice','cut_sheet','as_built','warranty','field_photo','other') DEFAULT 'other',
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`fileName` varchar(255),
	`mimeType` varchar(128),
	`fileSize` int,
	`version` int NOT NULL DEFAULT 1,
	`parentDocumentId` int,
	`status` enum('draft','pending_review','approved','rejected','archived') NOT NULL DEFAULT 'draft',
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manufacturers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`website` text,
	`repName` text,
	`repEmail` varchar(320),
	`repPhone` varchar(32),
	`lineCardUrl` text,
	`catalogUrl` text,
	`region` varchar(128),
	`notes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manufacturers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`parentId` int,
	`content` text NOT NULL,
	`authorId` int NOT NULL,
	`linkedDocumentId` int,
	`linkedMilestoneId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('quote_submitted','quote_approved','order_placed','in_production','shipped','delivered','installed','project_complete','custom') DEFAULT 'custom',
	`targetDate` timestamp,
	`actualDate` timestamp,
	`status` enum('pending','on_track','at_risk','delayed','complete') DEFAULT 'pending',
	`notes` text,
	`sortOrder` int DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int,
	`type` enum('submittal_decision','milestone_update','budget_change','new_document','new_message','change_order','project_update','system') DEFAULT 'system',
	`title` varchar(255) NOT NULL,
	`body` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`actionUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`manufacturerId` int,
	`manufacturerName` varchar(255),
	`modelNumber` varchar(255),
	`description` text,
	`category` varchar(128),
	`quantity` int NOT NULL DEFAULT 1,
	`unitCost` decimal(10,2),
	`totalCost` decimal(12,2),
	`cutSheetUrl` text,
	`specUrl` text,
	`status` enum('specified','submitted','approved','ordered','shipped','delivered','installed') DEFAULT 'specified',
	`orderStatus` varchar(128),
	`notes` text,
	`sortOrder` int DEFAULT 0,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_team` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` varchar(128),
	`addedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_team_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`status` enum('intake','active','pending_approval','ordered','delivered','complete','archived') NOT NULL DEFAULT 'intake',
	`region` enum('georgia','tennessee','alabama','national','other') DEFAULT 'georgia',
	`buildingType` varchar(128),
	`address` text,
	`city` varchar(128),
	`state` varchar(64),
	`originalBudget` decimal(12,2),
	`currentBudget` decimal(12,2),
	`budgetStatus` enum('on_budget','at_risk','over_budget') DEFAULT 'on_budget',
	`timelineStatus` enum('on_track','at_risk','delayed') DEFAULT 'on_track',
	`assignedRepId` int,
	`assignedPmId` int,
	`quoteSubmittedAt` timestamp,
	`approvedAt` timestamp,
	`orderedAt` timestamp,
	`targetDeliveryAt` timestamp,
	`deliveredAt` timestamp,
	`installedAt` timestamp,
	`completedAt` timestamp,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submittals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`documentId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`submittedBy` int NOT NULL,
	`reviewedBy` int,
	`status` enum('draft','submitted','under_review','approved','rejected','needs_revision','resubmitted') DEFAULT 'draft',
	`comments` text,
	`revisionNumber` int DEFAULT 1,
	`dueDate` timestamp,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submittals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('sls_admin','sls_rep','sls_pm','client_architect','client_gc','user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `company` text;--> statement-breakpoint
ALTER TABLE `users` ADD `title` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;