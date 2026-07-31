import type { INodeProperties } from 'n8n-workflow';

export const containerOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['container'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: "Retrieve a container's current status",
				routing: {
					request: {
						method: 'GET',
						url: '=/nodes/{{$parameter["node"]}}/lxc/{{$parameter["vmid"]}}/status/current',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
						],
					},
				},
				action: 'Get a container',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve all containers on a node',
				routing: {
					request: {
						method: 'GET',
						url: '=/nodes/{{$parameter["node"]}}/lxc',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'data',
								},
							},
						],
					},
				},
				action: 'Get many containers',
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start a container',
				routing: {
					request: {
						method: 'POST',
						url: '=/nodes/{{$parameter["node"]}}/lxc/{{$parameter["vmid"]}}/status/start',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "taskId": $response.body.data } }}',
								},
							},
						],
					},
				},
				action: 'Start a container',
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Forcefully stop a container',
				routing: {
					request: {
						method: 'POST',
						url: '=/nodes/{{$parameter["node"]}}/lxc/{{$parameter["vmid"]}}/status/stop',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "taskId": $response.body.data } }}',
								},
							},
						],
					},
				},
				action: 'Stop a container',
			},
			{
				name: 'Shut Down',
				value: 'shutdown',
				description: 'Gracefully shut down a container',
				routing: {
					request: {
						method: 'POST',
						url: '=/nodes/{{$parameter["node"]}}/lxc/{{$parameter["vmid"]}}/status/shutdown',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "taskId": $response.body.data } }}',
								},
							},
						],
					},
				},
				action: 'Shut down a container',
			},
			{
				name: 'Reboot',
				value: 'reboot',
				description: 'Reboot a container',
				routing: {
					request: {
						method: 'POST',
						url: '=/nodes/{{$parameter["node"]}}/lxc/{{$parameter["vmid"]}}/status/reboot',
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "taskId": $response.body.data } }}',
								},
							},
						],
					},
				},
				action: 'Reboot a container',
			},
		],
		default: 'getAll',
	},
];

export const containerFields: INodeProperties[] = [
	{
		displayName: 'Node Name',
		name: 'node',
		type: 'string',
		default: '',
		placeholder: 'pve',
		description: 'Name of the Proxmox cluster node the container runs on',
		required: true,
		displayOptions: {
			show: {
				resource: ['container'],
			},
		},
	},
	{
		displayName: 'Container ID',
		name: 'vmid',
		type: 'number',
		default: 0,
		description: 'ID of the container',
		required: true,
		displayOptions: {
			show: {
				resource: ['container'],
				operation: ['get', 'start', 'stop', 'shutdown', 'reboot'],
			},
		},
	},
];
