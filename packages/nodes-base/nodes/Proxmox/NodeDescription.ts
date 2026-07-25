import type { INodeProperties } from 'n8n-workflow';

export const nodeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['node'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: "Retrieve a cluster node's status",
				routing: {
					request: {
						method: 'GET',
						url: '=/nodes/{{$parameter["node"]}}/status',
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
				action: 'Get a node',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve all cluster nodes',
				routing: {
					request: {
						method: 'GET',
						url: '/nodes',
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
				action: 'Get many nodes',
			},
		],
		default: 'getAll',
	},
];

export const nodeFields: INodeProperties[] = [
	{
		displayName: 'Node Name',
		name: 'node',
		type: 'string',
		default: '',
		placeholder: 'pve',
		description: 'Name of the Proxmox cluster node',
		required: true,
		displayOptions: {
			show: {
				resource: ['node'],
				operation: ['get'],
			},
		},
	},
];
