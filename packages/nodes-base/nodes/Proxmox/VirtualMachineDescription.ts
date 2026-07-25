import type { INodeProperties } from 'n8n-workflow';

export const virtualMachineOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['virtualMachine'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: "Retrieve a virtual machine's current status",
				routing: {
					request: {
						method: 'GET',
						url: '=/nodes/{{$parameter["node"]}}/qemu/{{$parameter["vmid"]}}/status/current',
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
				action: 'Get a virtual machine',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve all virtual machines on a node',
				routing: {
					request: {
						method: 'GET',
						url: '=/nodes/{{$parameter["node"]}}/qemu',
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
				action: 'Get many virtual machines',
			},
			{
				name: 'Start',
				value: 'start',
				description: 'Start a virtual machine',
				routing: {
					request: {
						method: 'POST',
						url: '=/nodes/{{$parameter["node"]}}/qemu/{{$parameter["vmid"]}}/status/start',
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
				action: 'Start a virtual machine',
			},
			{
				name: 'Stop',
				value: 'stop',
				description: 'Forcefully stop a virtual machine',
				routing: {
					request: {
						method: 'POST',
						url: '=/nodes/{{$parameter["node"]}}/qemu/{{$parameter["vmid"]}}/status/stop',
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
				action: 'Stop a virtual machine',
			},
			{
				name: 'Shut Down',
				value: 'shutdown',
				description: 'Gracefully shut down a virtual machine',
				routing: {
					request: {
						method: 'POST',
						url: '=/nodes/{{$parameter["node"]}}/qemu/{{$parameter["vmid"]}}/status/shutdown',
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
				action: 'Shut down a virtual machine',
			},
			{
				name: 'Reboot',
				value: 'reboot',
				description: 'Reboot a virtual machine',
				routing: {
					request: {
						method: 'POST',
						url: '=/nodes/{{$parameter["node"]}}/qemu/{{$parameter["vmid"]}}/status/reboot',
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
				action: 'Reboot a virtual machine',
			},
		],
		default: 'getAll',
	},
];

export const virtualMachineFields: INodeProperties[] = [
	{
		displayName: 'Node Name',
		name: 'node',
		type: 'string',
		default: '',
		placeholder: 'pve',
		description: 'Name of the Proxmox cluster node the virtual machine runs on',
		required: true,
		displayOptions: {
			show: {
				resource: ['virtualMachine'],
			},
		},
	},
	{
		displayName: 'VM ID',
		name: 'vmid',
		type: 'number',
		default: 0,
		description: 'ID of the virtual machine',
		required: true,
		displayOptions: {
			show: {
				resource: ['virtualMachine'],
				operation: ['get', 'start', 'stop', 'shutdown', 'reboot'],
			},
		},
	},
];
