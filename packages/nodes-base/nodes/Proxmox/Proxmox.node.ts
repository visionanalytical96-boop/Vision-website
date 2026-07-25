import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { containerFields, containerOperations } from './ContainerDescription';
import { nodeFields, nodeOperations } from './NodeDescription';
import { virtualMachineFields, virtualMachineOperations } from './VirtualMachineDescription';

export class Proxmox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Proxmox',
		name: 'proxmox',
		icon: 'file:proxmox.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Manage nodes, virtual machines, and containers on a Proxmox VE server',
		defaults: {
			name: 'Proxmox',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'proxmoxApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '=https://{{$credentials.host}}:{{$credentials.port}}/api2/json',
			skipSslCertificateValidation: '={{$credentials.allowUnauthorizedCerts}}',
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'virtualMachine',
				options: [
					{
						name: 'Container',
						value: 'container',
					},
					{
						name: 'Node',
						value: 'node',
					},
					{
						name: 'Virtual Machine',
						value: 'virtualMachine',
					},
				],
			},
			...nodeOperations,
			...nodeFields,
			...virtualMachineOperations,
			...virtualMachineFields,
			...containerOperations,
			...containerFields,
		],
	};
}
