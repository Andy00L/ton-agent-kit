import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    address,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type DataSize = {
    $$type: 'DataSize';
    cells: bigint;
    bits: bigint;
    refs: bigint;
}

export function storeDataSize(src: DataSize) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.cells, 257);
        b_0.storeInt(src.bits, 257);
        b_0.storeInt(src.refs, 257);
    };
}

export function loadDataSize(slice: Slice) {
    const sc_0 = slice;
    const _cells = sc_0.loadIntBig(257);
    const _bits = sc_0.loadIntBig(257);
    const _refs = sc_0.loadIntBig(257);
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadGetterTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function storeTupleDataSize(source: DataSize) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.cells);
    builder.writeNumber(source.bits);
    builder.writeNumber(source.refs);
    return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
        },
        parse: (src) => {
            return loadDataSize(src.loadRef().beginParse());
        }
    }
}

export type SignedBundle = {
    $$type: 'SignedBundle';
    signature: Buffer;
    signedData: Slice;
}

export function storeSignedBundle(src: SignedBundle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBuffer(src.signature);
        b_0.storeBuilder(src.signedData.asBuilder());
    };
}

export function loadSignedBundle(slice: Slice) {
    const sc_0 = slice;
    const _signature = sc_0.loadBuffer(64);
    const _signedData = sc_0;
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function storeTupleSignedBundle(source: SignedBundle) {
    const builder = new TupleBuilder();
    builder.writeBuffer(source.signature);
    builder.writeSlice(source.signedData.asCell());
    return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
        },
        parse: (src) => {
            return loadSignedBundle(src.loadRef().beginParse());
        }
    }
}

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    const sc_0 = slice;
    const _code = sc_0.loadRef();
    const _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
    const builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounceable: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.bounceable);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    const sc_0 = slice;
    const _bounceable = sc_0.loadBit();
    const _sender = sc_0.loadAddress();
    const _value = sc_0.loadIntBig(257);
    const _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadGetterTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function storeTupleContext(source: Context) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.bounceable);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadSendParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleSendParameters(source: SendParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type MessageParameters = {
    $$type: 'MessageParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeMessageParameters(src: MessageParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadMessageParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleMessageParameters(source: MessageParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageParameters(src)).endCell());
        },
        parse: (src) => {
            return loadMessageParameters(src.loadRef().beginParse());
        }
    }
}

export type DeployParameters = {
    $$type: 'DeployParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    bounce: boolean;
    init: StateInit;
}

export function storeDeployParameters(src: DeployParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeBit(src.bounce);
        b_0.store(storeStateInit(src.init));
    };
}

export function loadDeployParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _bounce = sc_0.loadBit();
    const _init = loadStateInit(sc_0);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadGetterTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function storeTupleDeployParameters(source: DeployParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeBoolean(source.bounce);
    builder.writeTuple(storeTupleStateInit(source.init));
    return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
        },
        parse: (src) => {
            return loadDeployParameters(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(8);
    const _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleStdAddress(source: StdAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(32);
    const _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleVarAddress(source: VarAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type BasechainAddress = {
    $$type: 'BasechainAddress';
    hash: bigint | null;
}

export function storeBasechainAddress(src: BasechainAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        if (src.hash !== null && src.hash !== undefined) { b_0.storeBit(true).storeInt(src.hash, 257); } else { b_0.storeBit(false); }
    };
}

export function loadBasechainAddress(slice: Slice) {
    const sc_0 = slice;
    const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.hash);
    return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
        },
        parse: (src) => {
            return loadBasechainAddress(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadGetterTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function storeTupleDeploy(source: Deploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadGetterTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function storeTupleDeployOk(source: DeployOk) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadGetterTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function storeTupleFactoryDeploy(source: FactoryDeploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

export function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type Register = {
    $$type: 'Register';
    name: string;
    capabilities: string;
    available: boolean;
}

export function storeRegister(src: Register) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(950051591, 32);
        b_0.storeStringRefTail(src.name);
        b_0.storeStringRefTail(src.capabilities);
        b_0.storeBit(src.available);
    };
}

export function loadRegister(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 950051591) { throw Error('Invalid prefix'); }
    const _name = sc_0.loadStringRefTail();
    const _capabilities = sc_0.loadStringRefTail();
    const _available = sc_0.loadBit();
    return { $$type: 'Register' as const, name: _name, capabilities: _capabilities, available: _available };
}

export function loadTupleRegister(source: TupleReader) {
    const _name = source.readString();
    const _capabilities = source.readString();
    const _available = source.readBoolean();
    return { $$type: 'Register' as const, name: _name, capabilities: _capabilities, available: _available };
}

export function loadGetterTupleRegister(source: TupleReader) {
    const _name = source.readString();
    const _capabilities = source.readString();
    const _available = source.readBoolean();
    return { $$type: 'Register' as const, name: _name, capabilities: _capabilities, available: _available };
}

export function storeTupleRegister(source: Register) {
    const builder = new TupleBuilder();
    builder.writeString(source.name);
    builder.writeString(source.capabilities);
    builder.writeBoolean(source.available);
    return builder.build();
}

export function dictValueParserRegister(): DictionaryValue<Register> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRegister(src)).endCell());
        },
        parse: (src) => {
            return loadRegister(src.loadRef().beginParse());
        }
    }
}

export type Rate = {
    $$type: 'Rate';
    agentName: string;
    success: boolean;
}

export function storeRate(src: Rate) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2804297358, 32);
        b_0.storeStringRefTail(src.agentName);
        b_0.storeBit(src.success);
    };
}

export function loadRate(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2804297358) { throw Error('Invalid prefix'); }
    const _agentName = sc_0.loadStringRefTail();
    const _success = sc_0.loadBit();
    return { $$type: 'Rate' as const, agentName: _agentName, success: _success };
}

export function loadTupleRate(source: TupleReader) {
    const _agentName = source.readString();
    const _success = source.readBoolean();
    return { $$type: 'Rate' as const, agentName: _agentName, success: _success };
}

export function loadGetterTupleRate(source: TupleReader) {
    const _agentName = source.readString();
    const _success = source.readBoolean();
    return { $$type: 'Rate' as const, agentName: _agentName, success: _success };
}

export function storeTupleRate(source: Rate) {
    const builder = new TupleBuilder();
    builder.writeString(source.agentName);
    builder.writeBoolean(source.success);
    return builder.build();
}

export function dictValueParserRate(): DictionaryValue<Rate> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRate(src)).endCell());
        },
        parse: (src) => {
            return loadRate(src.loadRef().beginParse());
        }
    }
}

export type UpdateAvailability = {
    $$type: 'UpdateAvailability';
    name: string;
    available: boolean;
}

export function storeUpdateAvailability(src: UpdateAvailability) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1424124491, 32);
        b_0.storeStringRefTail(src.name);
        b_0.storeBit(src.available);
    };
}

export function loadUpdateAvailability(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1424124491) { throw Error('Invalid prefix'); }
    const _name = sc_0.loadStringRefTail();
    const _available = sc_0.loadBit();
    return { $$type: 'UpdateAvailability' as const, name: _name, available: _available };
}

export function loadTupleUpdateAvailability(source: TupleReader) {
    const _name = source.readString();
    const _available = source.readBoolean();
    return { $$type: 'UpdateAvailability' as const, name: _name, available: _available };
}

export function loadGetterTupleUpdateAvailability(source: TupleReader) {
    const _name = source.readString();
    const _available = source.readBoolean();
    return { $$type: 'UpdateAvailability' as const, name: _name, available: _available };
}

export function storeTupleUpdateAvailability(source: UpdateAvailability) {
    const builder = new TupleBuilder();
    builder.writeString(source.name);
    builder.writeBoolean(source.available);
    return builder.build();
}

export function dictValueParserUpdateAvailability(): DictionaryValue<UpdateAvailability> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeUpdateAvailability(src)).endCell());
        },
        parse: (src) => {
            return loadUpdateAvailability(src.loadRef().beginParse());
        }
    }
}

export type Withdraw = {
    $$type: 'Withdraw';
}

export function storeWithdraw(src: Withdraw) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(593874976, 32);
    };
}

export function loadWithdraw(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 593874976) { throw Error('Invalid prefix'); }
    return { $$type: 'Withdraw' as const };
}

export function loadTupleWithdraw(source: TupleReader) {
    return { $$type: 'Withdraw' as const };
}

export function loadGetterTupleWithdraw(source: TupleReader) {
    return { $$type: 'Withdraw' as const };
}

export function storeTupleWithdraw(source: Withdraw) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserWithdraw(): DictionaryValue<Withdraw> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeWithdraw(src)).endCell());
        },
        parse: (src) => {
            return loadWithdraw(src.loadRef().beginParse());
        }
    }
}

export type IndexCapability = {
    $$type: 'IndexCapability';
    agentIndex: bigint;
    capabilityHash: bigint;
}

export function storeIndexCapability(src: IndexCapability) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(344274104, 32);
        b_0.storeUint(src.agentIndex, 32);
        b_0.storeUint(src.capabilityHash, 256);
    };
}

export function loadIndexCapability(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 344274104) { throw Error('Invalid prefix'); }
    const _agentIndex = sc_0.loadUintBig(32);
    const _capabilityHash = sc_0.loadUintBig(256);
    return { $$type: 'IndexCapability' as const, agentIndex: _agentIndex, capabilityHash: _capabilityHash };
}

export function loadTupleIndexCapability(source: TupleReader) {
    const _agentIndex = source.readBigNumber();
    const _capabilityHash = source.readBigNumber();
    return { $$type: 'IndexCapability' as const, agentIndex: _agentIndex, capabilityHash: _capabilityHash };
}

export function loadGetterTupleIndexCapability(source: TupleReader) {
    const _agentIndex = source.readBigNumber();
    const _capabilityHash = source.readBigNumber();
    return { $$type: 'IndexCapability' as const, agentIndex: _agentIndex, capabilityHash: _capabilityHash };
}

export function storeTupleIndexCapability(source: IndexCapability) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.agentIndex);
    builder.writeNumber(source.capabilityHash);
    return builder.build();
}

export function dictValueParserIndexCapability(): DictionaryValue<IndexCapability> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeIndexCapability(src)).endCell());
        },
        parse: (src) => {
            return loadIndexCapability(src.loadRef().beginParse());
        }
    }
}

export type TriggerCleanup = {
    $$type: 'TriggerCleanup';
    maxClean: bigint;
}

export function storeTriggerCleanup(src: TriggerCleanup) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2266087279, 32);
        b_0.storeUint(src.maxClean, 8);
    };
}

export function loadTriggerCleanup(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2266087279) { throw Error('Invalid prefix'); }
    const _maxClean = sc_0.loadUintBig(8);
    return { $$type: 'TriggerCleanup' as const, maxClean: _maxClean };
}

export function loadTupleTriggerCleanup(source: TupleReader) {
    const _maxClean = source.readBigNumber();
    return { $$type: 'TriggerCleanup' as const, maxClean: _maxClean };
}

export function loadGetterTupleTriggerCleanup(source: TupleReader) {
    const _maxClean = source.readBigNumber();
    return { $$type: 'TriggerCleanup' as const, maxClean: _maxClean };
}

export function storeTupleTriggerCleanup(source: TriggerCleanup) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.maxClean);
    return builder.build();
}

export function dictValueParserTriggerCleanup(): DictionaryValue<TriggerCleanup> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTriggerCleanup(src)).endCell());
        },
        parse: (src) => {
            return loadTriggerCleanup(src.loadRef().beginParse());
        }
    }
}

export type NotifyDisputeOpened = {
    $$type: 'NotifyDisputeOpened';
    escrowAddress: Address;
    depositor: Address;
    beneficiary: Address;
    amount: bigint;
    votingDeadline: bigint;
}

export function storeNotifyDisputeOpened(src: NotifyDisputeOpened) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(796807257, 32);
        b_0.storeAddress(src.escrowAddress);
        b_0.storeAddress(src.depositor);
        b_0.storeAddress(src.beneficiary);
        b_0.storeCoins(src.amount);
        b_0.storeUint(src.votingDeadline, 32);
    };
}

export function loadNotifyDisputeOpened(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 796807257) { throw Error('Invalid prefix'); }
    const _escrowAddress = sc_0.loadAddress();
    const _depositor = sc_0.loadAddress();
    const _beneficiary = sc_0.loadAddress();
    const _amount = sc_0.loadCoins();
    const _votingDeadline = sc_0.loadUintBig(32);
    return { $$type: 'NotifyDisputeOpened' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline };
}

export function loadTupleNotifyDisputeOpened(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _amount = source.readBigNumber();
    const _votingDeadline = source.readBigNumber();
    return { $$type: 'NotifyDisputeOpened' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline };
}

export function loadGetterTupleNotifyDisputeOpened(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _amount = source.readBigNumber();
    const _votingDeadline = source.readBigNumber();
    return { $$type: 'NotifyDisputeOpened' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline };
}

export function storeTupleNotifyDisputeOpened(source: NotifyDisputeOpened) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.escrowAddress);
    builder.writeAddress(source.depositor);
    builder.writeAddress(source.beneficiary);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.votingDeadline);
    return builder.build();
}

export function dictValueParserNotifyDisputeOpened(): DictionaryValue<NotifyDisputeOpened> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeNotifyDisputeOpened(src)).endCell());
        },
        parse: (src) => {
            return loadNotifyDisputeOpened(src.loadRef().beginParse());
        }
    }
}

export type NotifyDisputeSettled = {
    $$type: 'NotifyDisputeSettled';
    escrowAddress: Address;
    released: boolean;
    refunded: boolean;
}

export function storeNotifyDisputeSettled(src: NotifyDisputeSettled) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3214956934, 32);
        b_0.storeAddress(src.escrowAddress);
        b_0.storeBit(src.released);
        b_0.storeBit(src.refunded);
    };
}

export function loadNotifyDisputeSettled(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3214956934) { throw Error('Invalid prefix'); }
    const _escrowAddress = sc_0.loadAddress();
    const _released = sc_0.loadBit();
    const _refunded = sc_0.loadBit();
    return { $$type: 'NotifyDisputeSettled' as const, escrowAddress: _escrowAddress, released: _released, refunded: _refunded };
}

export function loadTupleNotifyDisputeSettled(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _released = source.readBoolean();
    const _refunded = source.readBoolean();
    return { $$type: 'NotifyDisputeSettled' as const, escrowAddress: _escrowAddress, released: _released, refunded: _refunded };
}

export function loadGetterTupleNotifyDisputeSettled(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _released = source.readBoolean();
    const _refunded = source.readBoolean();
    return { $$type: 'NotifyDisputeSettled' as const, escrowAddress: _escrowAddress, released: _released, refunded: _refunded };
}

export function storeTupleNotifyDisputeSettled(source: NotifyDisputeSettled) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.escrowAddress);
    builder.writeBoolean(source.released);
    builder.writeBoolean(source.refunded);
    return builder.build();
}

export function dictValueParserNotifyDisputeSettled(): DictionaryValue<NotifyDisputeSettled> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeNotifyDisputeSettled(src)).endCell());
        },
        parse: (src) => {
            return loadNotifyDisputeSettled(src.loadRef().beginParse());
        }
    }
}

export type BroadcastIntent = {
    $$type: 'BroadcastIntent';
    serviceHash: bigint;
    budget: bigint;
    deadline: bigint;
}

export function storeBroadcastIntent(src: BroadcastIntent) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2523776749, 32);
        b_0.storeUint(src.serviceHash, 256);
        b_0.storeCoins(src.budget);
        b_0.storeUint(src.deadline, 32);
    };
}

export function loadBroadcastIntent(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2523776749) { throw Error('Invalid prefix'); }
    const _serviceHash = sc_0.loadUintBig(256);
    const _budget = sc_0.loadCoins();
    const _deadline = sc_0.loadUintBig(32);
    return { $$type: 'BroadcastIntent' as const, serviceHash: _serviceHash, budget: _budget, deadline: _deadline };
}

export function loadTupleBroadcastIntent(source: TupleReader) {
    const _serviceHash = source.readBigNumber();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    return { $$type: 'BroadcastIntent' as const, serviceHash: _serviceHash, budget: _budget, deadline: _deadline };
}

export function loadGetterTupleBroadcastIntent(source: TupleReader) {
    const _serviceHash = source.readBigNumber();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    return { $$type: 'BroadcastIntent' as const, serviceHash: _serviceHash, budget: _budget, deadline: _deadline };
}

export function storeTupleBroadcastIntent(source: BroadcastIntent) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.serviceHash);
    builder.writeNumber(source.budget);
    builder.writeNumber(source.deadline);
    return builder.build();
}

export function dictValueParserBroadcastIntent(): DictionaryValue<BroadcastIntent> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBroadcastIntent(src)).endCell());
        },
        parse: (src) => {
            return loadBroadcastIntent(src.loadRef().beginParse());
        }
    }
}

export type SendOffer = {
    $$type: 'SendOffer';
    intentIndex: bigint;
    price: bigint;
    deliveryTime: bigint;
}

export function storeSendOffer(src: SendOffer) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1834677927, 32);
        b_0.storeUint(src.intentIndex, 32);
        b_0.storeCoins(src.price);
        b_0.storeUint(src.deliveryTime, 32);
    };
}

export function loadSendOffer(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1834677927) { throw Error('Invalid prefix'); }
    const _intentIndex = sc_0.loadUintBig(32);
    const _price = sc_0.loadCoins();
    const _deliveryTime = sc_0.loadUintBig(32);
    return { $$type: 'SendOffer' as const, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime };
}

export function loadTupleSendOffer(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    return { $$type: 'SendOffer' as const, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime };
}

export function loadGetterTupleSendOffer(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    return { $$type: 'SendOffer' as const, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime };
}

export function storeTupleSendOffer(source: SendOffer) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.intentIndex);
    builder.writeNumber(source.price);
    builder.writeNumber(source.deliveryTime);
    return builder.build();
}

export function dictValueParserSendOffer(): DictionaryValue<SendOffer> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendOffer(src)).endCell());
        },
        parse: (src) => {
            return loadSendOffer(src.loadRef().beginParse());
        }
    }
}

export type AcceptOffer = {
    $$type: 'AcceptOffer';
    offerIndex: bigint;
}

export function storeAcceptOffer(src: AcceptOffer) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(931468685, 32);
        b_0.storeUint(src.offerIndex, 32);
    };
}

export function loadAcceptOffer(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 931468685) { throw Error('Invalid prefix'); }
    const _offerIndex = sc_0.loadUintBig(32);
    return { $$type: 'AcceptOffer' as const, offerIndex: _offerIndex };
}

export function loadTupleAcceptOffer(source: TupleReader) {
    const _offerIndex = source.readBigNumber();
    return { $$type: 'AcceptOffer' as const, offerIndex: _offerIndex };
}

export function loadGetterTupleAcceptOffer(source: TupleReader) {
    const _offerIndex = source.readBigNumber();
    return { $$type: 'AcceptOffer' as const, offerIndex: _offerIndex };
}

export function storeTupleAcceptOffer(source: AcceptOffer) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.offerIndex);
    return builder.build();
}

export function dictValueParserAcceptOffer(): DictionaryValue<AcceptOffer> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAcceptOffer(src)).endCell());
        },
        parse: (src) => {
            return loadAcceptOffer(src.loadRef().beginParse());
        }
    }
}

export type CancelIntent = {
    $$type: 'CancelIntent';
    intentIndex: bigint;
}

export function storeCancelIntent(src: CancelIntent) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1000023198, 32);
        b_0.storeUint(src.intentIndex, 32);
    };
}

export function loadCancelIntent(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1000023198) { throw Error('Invalid prefix'); }
    const _intentIndex = sc_0.loadUintBig(32);
    return { $$type: 'CancelIntent' as const, intentIndex: _intentIndex };
}

export function loadTupleCancelIntent(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    return { $$type: 'CancelIntent' as const, intentIndex: _intentIndex };
}

export function loadGetterTupleCancelIntent(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    return { $$type: 'CancelIntent' as const, intentIndex: _intentIndex };
}

export function storeTupleCancelIntent(source: CancelIntent) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.intentIndex);
    return builder.build();
}

export function dictValueParserCancelIntent(): DictionaryValue<CancelIntent> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCancelIntent(src)).endCell());
        },
        parse: (src) => {
            return loadCancelIntent(src.loadRef().beginParse());
        }
    }
}

export type SettleDeal = {
    $$type: 'SettleDeal';
    intentIndex: bigint;
    rating: bigint;
}

export function storeSettleDeal(src: SettleDeal) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(484654478, 32);
        b_0.storeUint(src.intentIndex, 32);
        b_0.storeUint(src.rating, 8);
    };
}

export function loadSettleDeal(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 484654478) { throw Error('Invalid prefix'); }
    const _intentIndex = sc_0.loadUintBig(32);
    const _rating = sc_0.loadUintBig(8);
    return { $$type: 'SettleDeal' as const, intentIndex: _intentIndex, rating: _rating };
}

export function loadTupleSettleDeal(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    const _rating = source.readBigNumber();
    return { $$type: 'SettleDeal' as const, intentIndex: _intentIndex, rating: _rating };
}

export function loadGetterTupleSettleDeal(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    const _rating = source.readBigNumber();
    return { $$type: 'SettleDeal' as const, intentIndex: _intentIndex, rating: _rating };
}

export function storeTupleSettleDeal(source: SettleDeal) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.intentIndex);
    builder.writeNumber(source.rating);
    return builder.build();
}

export function dictValueParserSettleDeal(): DictionaryValue<SettleDeal> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSettleDeal(src)).endCell());
        },
        parse: (src) => {
            return loadSettleDeal(src.loadRef().beginParse());
        }
    }
}

export type AgentData = {
    $$type: 'AgentData';
    owner: Address;
    available: boolean;
    totalTasks: bigint;
    successes: bigint;
    registeredAt: bigint;
}

export function storeAgentData(src: AgentData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeBit(src.available);
        b_0.storeUint(src.totalTasks, 32);
        b_0.storeUint(src.successes, 32);
        b_0.storeUint(src.registeredAt, 32);
    };
}

export function loadAgentData(slice: Slice) {
    const sc_0 = slice;
    const _owner = sc_0.loadAddress();
    const _available = sc_0.loadBit();
    const _totalTasks = sc_0.loadUintBig(32);
    const _successes = sc_0.loadUintBig(32);
    const _registeredAt = sc_0.loadUintBig(32);
    return { $$type: 'AgentData' as const, owner: _owner, available: _available, totalTasks: _totalTasks, successes: _successes, registeredAt: _registeredAt };
}

export function loadTupleAgentData(source: TupleReader) {
    const _owner = source.readAddress();
    const _available = source.readBoolean();
    const _totalTasks = source.readBigNumber();
    const _successes = source.readBigNumber();
    const _registeredAt = source.readBigNumber();
    return { $$type: 'AgentData' as const, owner: _owner, available: _available, totalTasks: _totalTasks, successes: _successes, registeredAt: _registeredAt };
}

export function loadGetterTupleAgentData(source: TupleReader) {
    const _owner = source.readAddress();
    const _available = source.readBoolean();
    const _totalTasks = source.readBigNumber();
    const _successes = source.readBigNumber();
    const _registeredAt = source.readBigNumber();
    return { $$type: 'AgentData' as const, owner: _owner, available: _available, totalTasks: _totalTasks, successes: _successes, registeredAt: _registeredAt };
}

export function storeTupleAgentData(source: AgentData) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeBoolean(source.available);
    builder.writeNumber(source.totalTasks);
    builder.writeNumber(source.successes);
    builder.writeNumber(source.registeredAt);
    return builder.build();
}

export function dictValueParserAgentData(): DictionaryValue<AgentData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAgentData(src)).endCell());
        },
        parse: (src) => {
            return loadAgentData(src.loadRef().beginParse());
        }
    }
}

export type DisputeInfo = {
    $$type: 'DisputeInfo';
    escrowAddress: Address;
    depositor: Address;
    beneficiary: Address;
    amount: bigint;
    votingDeadline: bigint;
    settled: boolean;
}

export function storeDisputeInfo(src: DisputeInfo) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.escrowAddress);
        b_0.storeAddress(src.depositor);
        b_0.storeAddress(src.beneficiary);
        b_0.storeCoins(src.amount);
        b_0.storeUint(src.votingDeadline, 32);
        b_0.storeBit(src.settled);
    };
}

export function loadDisputeInfo(slice: Slice) {
    const sc_0 = slice;
    const _escrowAddress = sc_0.loadAddress();
    const _depositor = sc_0.loadAddress();
    const _beneficiary = sc_0.loadAddress();
    const _amount = sc_0.loadCoins();
    const _votingDeadline = sc_0.loadUintBig(32);
    const _settled = sc_0.loadBit();
    return { $$type: 'DisputeInfo' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline, settled: _settled };
}

export function loadTupleDisputeInfo(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _amount = source.readBigNumber();
    const _votingDeadline = source.readBigNumber();
    const _settled = source.readBoolean();
    return { $$type: 'DisputeInfo' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline, settled: _settled };
}

export function loadGetterTupleDisputeInfo(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _amount = source.readBigNumber();
    const _votingDeadline = source.readBigNumber();
    const _settled = source.readBoolean();
    return { $$type: 'DisputeInfo' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline, settled: _settled };
}

export function storeTupleDisputeInfo(source: DisputeInfo) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.escrowAddress);
    builder.writeAddress(source.depositor);
    builder.writeAddress(source.beneficiary);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.votingDeadline);
    builder.writeBoolean(source.settled);
    return builder.build();
}

export function dictValueParserDisputeInfo(): DictionaryValue<DisputeInfo> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDisputeInfo(src)).endCell());
        },
        parse: (src) => {
            return loadDisputeInfo(src.loadRef().beginParse());
        }
    }
}

export type AgentCleanupInfo = {
    $$type: 'AgentCleanupInfo';
    index: bigint;
    exists: boolean;
    score: bigint;
    totalRatings: bigint;
    registeredAt: bigint;
    lastActive: bigint;
    daysSinceActive: bigint;
    daysSinceRegistered: bigint;
    eligibleForCleanup: boolean;
    cleanupReason: bigint;
}

export function storeAgentCleanupInfo(src: AgentCleanupInfo) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(src.index, 32);
        b_0.storeBit(src.exists);
        b_0.storeUint(src.score, 16);
        b_0.storeUint(src.totalRatings, 32);
        b_0.storeUint(src.registeredAt, 32);
        b_0.storeUint(src.lastActive, 32);
        b_0.storeUint(src.daysSinceActive, 32);
        b_0.storeUint(src.daysSinceRegistered, 32);
        b_0.storeBit(src.eligibleForCleanup);
        b_0.storeUint(src.cleanupReason, 8);
    };
}

export function loadAgentCleanupInfo(slice: Slice) {
    const sc_0 = slice;
    const _index = sc_0.loadUintBig(32);
    const _exists = sc_0.loadBit();
    const _score = sc_0.loadUintBig(16);
    const _totalRatings = sc_0.loadUintBig(32);
    const _registeredAt = sc_0.loadUintBig(32);
    const _lastActive = sc_0.loadUintBig(32);
    const _daysSinceActive = sc_0.loadUintBig(32);
    const _daysSinceRegistered = sc_0.loadUintBig(32);
    const _eligibleForCleanup = sc_0.loadBit();
    const _cleanupReason = sc_0.loadUintBig(8);
    return { $$type: 'AgentCleanupInfo' as const, index: _index, exists: _exists, score: _score, totalRatings: _totalRatings, registeredAt: _registeredAt, lastActive: _lastActive, daysSinceActive: _daysSinceActive, daysSinceRegistered: _daysSinceRegistered, eligibleForCleanup: _eligibleForCleanup, cleanupReason: _cleanupReason };
}

export function loadTupleAgentCleanupInfo(source: TupleReader) {
    const _index = source.readBigNumber();
    const _exists = source.readBoolean();
    const _score = source.readBigNumber();
    const _totalRatings = source.readBigNumber();
    const _registeredAt = source.readBigNumber();
    const _lastActive = source.readBigNumber();
    const _daysSinceActive = source.readBigNumber();
    const _daysSinceRegistered = source.readBigNumber();
    const _eligibleForCleanup = source.readBoolean();
    const _cleanupReason = source.readBigNumber();
    return { $$type: 'AgentCleanupInfo' as const, index: _index, exists: _exists, score: _score, totalRatings: _totalRatings, registeredAt: _registeredAt, lastActive: _lastActive, daysSinceActive: _daysSinceActive, daysSinceRegistered: _daysSinceRegistered, eligibleForCleanup: _eligibleForCleanup, cleanupReason: _cleanupReason };
}

export function loadGetterTupleAgentCleanupInfo(source: TupleReader) {
    const _index = source.readBigNumber();
    const _exists = source.readBoolean();
    const _score = source.readBigNumber();
    const _totalRatings = source.readBigNumber();
    const _registeredAt = source.readBigNumber();
    const _lastActive = source.readBigNumber();
    const _daysSinceActive = source.readBigNumber();
    const _daysSinceRegistered = source.readBigNumber();
    const _eligibleForCleanup = source.readBoolean();
    const _cleanupReason = source.readBigNumber();
    return { $$type: 'AgentCleanupInfo' as const, index: _index, exists: _exists, score: _score, totalRatings: _totalRatings, registeredAt: _registeredAt, lastActive: _lastActive, daysSinceActive: _daysSinceActive, daysSinceRegistered: _daysSinceRegistered, eligibleForCleanup: _eligibleForCleanup, cleanupReason: _cleanupReason };
}

export function storeTupleAgentCleanupInfo(source: AgentCleanupInfo) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.index);
    builder.writeBoolean(source.exists);
    builder.writeNumber(source.score);
    builder.writeNumber(source.totalRatings);
    builder.writeNumber(source.registeredAt);
    builder.writeNumber(source.lastActive);
    builder.writeNumber(source.daysSinceActive);
    builder.writeNumber(source.daysSinceRegistered);
    builder.writeBoolean(source.eligibleForCleanup);
    builder.writeNumber(source.cleanupReason);
    return builder.build();
}

export function dictValueParserAgentCleanupInfo(): DictionaryValue<AgentCleanupInfo> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAgentCleanupInfo(src)).endCell());
        },
        parse: (src) => {
            return loadAgentCleanupInfo(src.loadRef().beginParse());
        }
    }
}

export type IntentData = {
    $$type: 'IntentData';
    buyer: Address;
    serviceHash: bigint;
    budget: bigint;
    deadline: bigint;
    status: bigint;
    acceptedOffer: bigint;
    isExpired: boolean;
}

export function storeIntentData(src: IntentData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.buyer);
        b_0.storeUint(src.serviceHash, 256);
        b_0.storeCoins(src.budget);
        b_0.storeUint(src.deadline, 32);
        b_0.storeUint(src.status, 8);
        b_0.storeUint(src.acceptedOffer, 32);
        b_0.storeBit(src.isExpired);
    };
}

export function loadIntentData(slice: Slice) {
    const sc_0 = slice;
    const _buyer = sc_0.loadAddress();
    const _serviceHash = sc_0.loadUintBig(256);
    const _budget = sc_0.loadCoins();
    const _deadline = sc_0.loadUintBig(32);
    const _status = sc_0.loadUintBig(8);
    const _acceptedOffer = sc_0.loadUintBig(32);
    const _isExpired = sc_0.loadBit();
    return { $$type: 'IntentData' as const, buyer: _buyer, serviceHash: _serviceHash, budget: _budget, deadline: _deadline, status: _status, acceptedOffer: _acceptedOffer, isExpired: _isExpired };
}

export function loadTupleIntentData(source: TupleReader) {
    const _buyer = source.readAddress();
    const _serviceHash = source.readBigNumber();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _status = source.readBigNumber();
    const _acceptedOffer = source.readBigNumber();
    const _isExpired = source.readBoolean();
    return { $$type: 'IntentData' as const, buyer: _buyer, serviceHash: _serviceHash, budget: _budget, deadline: _deadline, status: _status, acceptedOffer: _acceptedOffer, isExpired: _isExpired };
}

export function loadGetterTupleIntentData(source: TupleReader) {
    const _buyer = source.readAddress();
    const _serviceHash = source.readBigNumber();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _status = source.readBigNumber();
    const _acceptedOffer = source.readBigNumber();
    const _isExpired = source.readBoolean();
    return { $$type: 'IntentData' as const, buyer: _buyer, serviceHash: _serviceHash, budget: _budget, deadline: _deadline, status: _status, acceptedOffer: _acceptedOffer, isExpired: _isExpired };
}

export function storeTupleIntentData(source: IntentData) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.buyer);
    builder.writeNumber(source.serviceHash);
    builder.writeNumber(source.budget);
    builder.writeNumber(source.deadline);
    builder.writeNumber(source.status);
    builder.writeNumber(source.acceptedOffer);
    builder.writeBoolean(source.isExpired);
    return builder.build();
}

export function dictValueParserIntentData(): DictionaryValue<IntentData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeIntentData(src)).endCell());
        },
        parse: (src) => {
            return loadIntentData(src.loadRef().beginParse());
        }
    }
}

export type OfferData = {
    $$type: 'OfferData';
    seller: Address;
    intentIndex: bigint;
    price: bigint;
    deliveryTime: bigint;
    status: bigint;
}

export function storeOfferData(src: OfferData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.seller);
        b_0.storeUint(src.intentIndex, 32);
        b_0.storeCoins(src.price);
        b_0.storeUint(src.deliveryTime, 32);
        b_0.storeUint(src.status, 8);
    };
}

export function loadOfferData(slice: Slice) {
    const sc_0 = slice;
    const _seller = sc_0.loadAddress();
    const _intentIndex = sc_0.loadUintBig(32);
    const _price = sc_0.loadCoins();
    const _deliveryTime = sc_0.loadUintBig(32);
    const _status = sc_0.loadUintBig(8);
    return { $$type: 'OfferData' as const, seller: _seller, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, status: _status };
}

export function loadTupleOfferData(source: TupleReader) {
    const _seller = source.readAddress();
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    const _status = source.readBigNumber();
    return { $$type: 'OfferData' as const, seller: _seller, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, status: _status };
}

export function loadGetterTupleOfferData(source: TupleReader) {
    const _seller = source.readAddress();
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    const _status = source.readBigNumber();
    return { $$type: 'OfferData' as const, seller: _seller, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, status: _status };
}

export function storeTupleOfferData(source: OfferData) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.seller);
    builder.writeNumber(source.intentIndex);
    builder.writeNumber(source.price);
    builder.writeNumber(source.deliveryTime);
    builder.writeNumber(source.status);
    return builder.build();
}

export function dictValueParserOfferData(): DictionaryValue<OfferData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeOfferData(src)).endCell());
        },
        parse: (src) => {
            return loadOfferData(src.loadRef().beginParse());
        }
    }
}

export type StorageInfo = {
    $$type: 'StorageInfo';
    storageFund: bigint;
    totalCells: bigint;
    annualCost: bigint;
    yearsCovered: bigint;
}

export function storeStorageInfo(src: StorageInfo) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeCoins(src.storageFund);
        b_0.storeUint(src.totalCells, 32);
        b_0.storeCoins(src.annualCost);
        b_0.storeUint(src.yearsCovered, 32);
    };
}

export function loadStorageInfo(slice: Slice) {
    const sc_0 = slice;
    const _storageFund = sc_0.loadCoins();
    const _totalCells = sc_0.loadUintBig(32);
    const _annualCost = sc_0.loadCoins();
    const _yearsCovered = sc_0.loadUintBig(32);
    return { $$type: 'StorageInfo' as const, storageFund: _storageFund, totalCells: _totalCells, annualCost: _annualCost, yearsCovered: _yearsCovered };
}

export function loadTupleStorageInfo(source: TupleReader) {
    const _storageFund = source.readBigNumber();
    const _totalCells = source.readBigNumber();
    const _annualCost = source.readBigNumber();
    const _yearsCovered = source.readBigNumber();
    return { $$type: 'StorageInfo' as const, storageFund: _storageFund, totalCells: _totalCells, annualCost: _annualCost, yearsCovered: _yearsCovered };
}

export function loadGetterTupleStorageInfo(source: TupleReader) {
    const _storageFund = source.readBigNumber();
    const _totalCells = source.readBigNumber();
    const _annualCost = source.readBigNumber();
    const _yearsCovered = source.readBigNumber();
    return { $$type: 'StorageInfo' as const, storageFund: _storageFund, totalCells: _totalCells, annualCost: _annualCost, yearsCovered: _yearsCovered };
}

export function storeTupleStorageInfo(source: StorageInfo) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.storageFund);
    builder.writeNumber(source.totalCells);
    builder.writeNumber(source.annualCost);
    builder.writeNumber(source.yearsCovered);
    return builder.build();
}

export function dictValueParserStorageInfo(): DictionaryValue<StorageInfo> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStorageInfo(src)).endCell());
        },
        parse: (src) => {
            return loadStorageInfo(src.loadRef().beginParse());
        }
    }
}

export type Reputation$Data = {
    $$type: 'Reputation$Data';
    owner: Address;
    fee: bigint;
    agentCount: bigint;
    agentOwners: Dictionary<number, Address>;
    agentAvailable: Dictionary<number, boolean>;
    agentTotalTasks: Dictionary<number, number>;
    agentSuccesses: Dictionary<number, number>;
    agentRegisteredAt: Dictionary<number, number>;
    agentLastActive: Dictionary<number, number>;
    nameToIndex: Dictionary<bigint, number>;
    capabilityIndex: Dictionary<bigint, Cell>;
    openDisputes: Dictionary<number, Address>;
    disputeDepositors: Dictionary<number, Address>;
    disputeBeneficiaries: Dictionary<number, Address>;
    disputeAmounts: Dictionary<number, bigint>;
    disputeDeadlines: Dictionary<number, number>;
    disputeSettled: Dictionary<number, boolean>;
    disputeCount: bigint;
    cleanupCursor: bigint;
    intents: Dictionary<number, Address>;
    intentServiceHashes: Dictionary<number, bigint>;
    intentBudgets: Dictionary<number, bigint>;
    intentDeadlines: Dictionary<number, number>;
    intentStatuses: Dictionary<number, number>;
    intentAcceptedOffer: Dictionary<number, number>;
    intentCount: bigint;
    intentsByService: Dictionary<bigint, Cell>;
    offers: Dictionary<number, Address>;
    offerIntents: Dictionary<number, number>;
    offerPrices: Dictionary<number, bigint>;
    offerDeliveryTimes: Dictionary<number, number>;
    offerStatuses: Dictionary<number, number>;
    offerCount: bigint;
    intentCleanupCursor: bigint;
    agentActiveIntents: Dictionary<Address, bigint>;
    maxIntentsPerAgent: bigint;
    storageFund: bigint;
    accumulatedFees: bigint;
}

export function storeReputation$Data(src: Reputation$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
        b_0.storeCoins(src.fee);
        b_0.storeUint(src.agentCount, 32);
        b_0.storeDict(src.agentOwners, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_0.storeDict(src.agentAvailable, Dictionary.Keys.Uint(32), Dictionary.Values.Bool());
        const b_1 = new Builder();
        b_1.storeDict(src.agentTotalTasks, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_1.storeDict(src.agentSuccesses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_1.storeDict(src.agentRegisteredAt, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        const b_2 = new Builder();
        b_2.storeDict(src.agentLastActive, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_2.storeDict(src.nameToIndex, Dictionary.Keys.BigUint(256), Dictionary.Values.Uint(32));
        b_2.storeDict(src.capabilityIndex, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
        const b_3 = new Builder();
        b_3.storeDict(src.openDisputes, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_3.storeDict(src.disputeDepositors, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_3.storeDict(src.disputeBeneficiaries, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        const b_4 = new Builder();
        b_4.storeDict(src.disputeAmounts, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257));
        b_4.storeDict(src.disputeDeadlines, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_4.storeDict(src.disputeSettled, Dictionary.Keys.Uint(32), Dictionary.Values.Bool());
        b_4.storeUint(src.disputeCount, 32);
        b_4.storeUint(src.cleanupCursor, 32);
        const b_5 = new Builder();
        b_5.storeDict(src.intents, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_5.storeDict(src.intentServiceHashes, Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256));
        b_5.storeDict(src.intentBudgets, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257));
        const b_6 = new Builder();
        b_6.storeDict(src.intentDeadlines, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_6.storeDict(src.intentStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8));
        b_6.storeDict(src.intentAcceptedOffer, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_6.storeUint(src.intentCount, 32);
        const b_7 = new Builder();
        b_7.storeDict(src.intentsByService, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
        b_7.storeDict(src.offers, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_7.storeDict(src.offerIntents, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        const b_8 = new Builder();
        b_8.storeDict(src.offerPrices, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257));
        b_8.storeDict(src.offerDeliveryTimes, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_8.storeDict(src.offerStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8));
        b_8.storeUint(src.offerCount, 32);
        b_8.storeUint(src.intentCleanupCursor, 32);
        b_8.storeDict(src.agentActiveIntents, Dictionary.Keys.Address(), Dictionary.Values.BigInt(257));
        b_8.storeUint(src.maxIntentsPerAgent, 8);
        b_8.storeCoins(src.storageFund);
        b_8.storeCoins(src.accumulatedFees);
        b_7.storeRef(b_8.endCell());
        b_6.storeRef(b_7.endCell());
        b_5.storeRef(b_6.endCell());
        b_4.storeRef(b_5.endCell());
        b_3.storeRef(b_4.endCell());
        b_2.storeRef(b_3.endCell());
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadReputation$Data(slice: Slice) {
    const sc_0 = slice;
    const _owner = sc_0.loadAddress();
    const _fee = sc_0.loadCoins();
    const _agentCount = sc_0.loadUintBig(32);
    const _agentOwners = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_0);
    const _agentAvailable = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), sc_0);
    const sc_1 = sc_0.loadRef().beginParse();
    const _agentTotalTasks = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_1);
    const _agentSuccesses = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_1);
    const _agentRegisteredAt = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_1);
    const sc_2 = sc_1.loadRef().beginParse();
    const _agentLastActive = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_2);
    const _nameToIndex = Dictionary.load(Dictionary.Keys.BigUint(256), Dictionary.Values.Uint(32), sc_2);
    const _capabilityIndex = Dictionary.load(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), sc_2);
    const sc_3 = sc_2.loadRef().beginParse();
    const _openDisputes = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_3);
    const _disputeDepositors = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_3);
    const _disputeBeneficiaries = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_3);
    const sc_4 = sc_3.loadRef().beginParse();
    const _disputeAmounts = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), sc_4);
    const _disputeDeadlines = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_4);
    const _disputeSettled = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), sc_4);
    const _disputeCount = sc_4.loadUintBig(32);
    const _cleanupCursor = sc_4.loadUintBig(32);
    const sc_5 = sc_4.loadRef().beginParse();
    const _intents = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_5);
    const _intentServiceHashes = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256), sc_5);
    const _intentBudgets = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), sc_5);
    const sc_6 = sc_5.loadRef().beginParse();
    const _intentDeadlines = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_6);
    const _intentStatuses = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), sc_6);
    const _intentAcceptedOffer = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_6);
    const _intentCount = sc_6.loadUintBig(32);
    const sc_7 = sc_6.loadRef().beginParse();
    const _intentsByService = Dictionary.load(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), sc_7);
    const _offers = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_7);
    const _offerIntents = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_7);
    const sc_8 = sc_7.loadRef().beginParse();
    const _offerPrices = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), sc_8);
    const _offerDeliveryTimes = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_8);
    const _offerStatuses = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), sc_8);
    const _offerCount = sc_8.loadUintBig(32);
    const _intentCleanupCursor = sc_8.loadUintBig(32);
    const _agentActiveIntents = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), sc_8);
    const _maxIntentsPerAgent = sc_8.loadUintBig(8);
    const _storageFund = sc_8.loadCoins();
    const _accumulatedFees = sc_8.loadCoins();
    return { $$type: 'Reputation$Data' as const, owner: _owner, fee: _fee, agentCount: _agentCount, agentOwners: _agentOwners, agentAvailable: _agentAvailable, agentTotalTasks: _agentTotalTasks, agentSuccesses: _agentSuccesses, agentRegisteredAt: _agentRegisteredAt, agentLastActive: _agentLastActive, nameToIndex: _nameToIndex, capabilityIndex: _capabilityIndex, openDisputes: _openDisputes, disputeDepositors: _disputeDepositors, disputeBeneficiaries: _disputeBeneficiaries, disputeAmounts: _disputeAmounts, disputeDeadlines: _disputeDeadlines, disputeSettled: _disputeSettled, disputeCount: _disputeCount, cleanupCursor: _cleanupCursor, intents: _intents, intentServiceHashes: _intentServiceHashes, intentBudgets: _intentBudgets, intentDeadlines: _intentDeadlines, intentStatuses: _intentStatuses, intentAcceptedOffer: _intentAcceptedOffer, intentCount: _intentCount, intentsByService: _intentsByService, offers: _offers, offerIntents: _offerIntents, offerPrices: _offerPrices, offerDeliveryTimes: _offerDeliveryTimes, offerStatuses: _offerStatuses, offerCount: _offerCount, intentCleanupCursor: _intentCleanupCursor, agentActiveIntents: _agentActiveIntents, maxIntentsPerAgent: _maxIntentsPerAgent, storageFund: _storageFund, accumulatedFees: _accumulatedFees };
}

export function loadTupleReputation$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _fee = source.readBigNumber();
    const _agentCount = source.readBigNumber();
    const _agentOwners = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _agentAvailable = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _agentTotalTasks = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentSuccesses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentRegisteredAt = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentLastActive = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _nameToIndex = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Uint(32), source.readCellOpt());
    const _capabilityIndex = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), source.readCellOpt());
    const _openDisputes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _disputeDepositors = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _disputeBeneficiaries = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    source = source.readTuple();
    const _disputeAmounts = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _disputeDeadlines = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _disputeSettled = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _disputeCount = source.readBigNumber();
    const _cleanupCursor = source.readBigNumber();
    const _intents = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _intentServiceHashes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256), source.readCellOpt());
    const _intentBudgets = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _intentDeadlines = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _intentAcceptedOffer = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentCount = source.readBigNumber();
    const _intentsByService = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), source.readCellOpt());
    const _offers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    source = source.readTuple();
    const _offerIntents = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerPrices = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _offerDeliveryTimes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _offerCount = source.readBigNumber();
    const _intentCleanupCursor = source.readBigNumber();
    const _agentActiveIntents = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _maxIntentsPerAgent = source.readBigNumber();
    const _storageFund = source.readBigNumber();
    const _accumulatedFees = source.readBigNumber();
    return { $$type: 'Reputation$Data' as const, owner: _owner, fee: _fee, agentCount: _agentCount, agentOwners: _agentOwners, agentAvailable: _agentAvailable, agentTotalTasks: _agentTotalTasks, agentSuccesses: _agentSuccesses, agentRegisteredAt: _agentRegisteredAt, agentLastActive: _agentLastActive, nameToIndex: _nameToIndex, capabilityIndex: _capabilityIndex, openDisputes: _openDisputes, disputeDepositors: _disputeDepositors, disputeBeneficiaries: _disputeBeneficiaries, disputeAmounts: _disputeAmounts, disputeDeadlines: _disputeDeadlines, disputeSettled: _disputeSettled, disputeCount: _disputeCount, cleanupCursor: _cleanupCursor, intents: _intents, intentServiceHashes: _intentServiceHashes, intentBudgets: _intentBudgets, intentDeadlines: _intentDeadlines, intentStatuses: _intentStatuses, intentAcceptedOffer: _intentAcceptedOffer, intentCount: _intentCount, intentsByService: _intentsByService, offers: _offers, offerIntents: _offerIntents, offerPrices: _offerPrices, offerDeliveryTimes: _offerDeliveryTimes, offerStatuses: _offerStatuses, offerCount: _offerCount, intentCleanupCursor: _intentCleanupCursor, agentActiveIntents: _agentActiveIntents, maxIntentsPerAgent: _maxIntentsPerAgent, storageFund: _storageFund, accumulatedFees: _accumulatedFees };
}

export function loadGetterTupleReputation$Data(source: TupleReader) {
    const _owner = source.readAddress();
    const _fee = source.readBigNumber();
    const _agentCount = source.readBigNumber();
    const _agentOwners = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _agentAvailable = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _agentTotalTasks = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentSuccesses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentRegisteredAt = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _agentLastActive = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _nameToIndex = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Uint(32), source.readCellOpt());
    const _capabilityIndex = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), source.readCellOpt());
    const _openDisputes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _disputeDepositors = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _disputeBeneficiaries = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _disputeAmounts = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _disputeDeadlines = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _disputeSettled = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _disputeCount = source.readBigNumber();
    const _cleanupCursor = source.readBigNumber();
    const _intents = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _intentServiceHashes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256), source.readCellOpt());
    const _intentBudgets = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _intentDeadlines = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _intentAcceptedOffer = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentCount = source.readBigNumber();
    const _intentsByService = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), source.readCellOpt());
    const _offers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _offerIntents = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerPrices = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _offerDeliveryTimes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _offerCount = source.readBigNumber();
    const _intentCleanupCursor = source.readBigNumber();
    const _agentActiveIntents = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _maxIntentsPerAgent = source.readBigNumber();
    const _storageFund = source.readBigNumber();
    const _accumulatedFees = source.readBigNumber();
    return { $$type: 'Reputation$Data' as const, owner: _owner, fee: _fee, agentCount: _agentCount, agentOwners: _agentOwners, agentAvailable: _agentAvailable, agentTotalTasks: _agentTotalTasks, agentSuccesses: _agentSuccesses, agentRegisteredAt: _agentRegisteredAt, agentLastActive: _agentLastActive, nameToIndex: _nameToIndex, capabilityIndex: _capabilityIndex, openDisputes: _openDisputes, disputeDepositors: _disputeDepositors, disputeBeneficiaries: _disputeBeneficiaries, disputeAmounts: _disputeAmounts, disputeDeadlines: _disputeDeadlines, disputeSettled: _disputeSettled, disputeCount: _disputeCount, cleanupCursor: _cleanupCursor, intents: _intents, intentServiceHashes: _intentServiceHashes, intentBudgets: _intentBudgets, intentDeadlines: _intentDeadlines, intentStatuses: _intentStatuses, intentAcceptedOffer: _intentAcceptedOffer, intentCount: _intentCount, intentsByService: _intentsByService, offers: _offers, offerIntents: _offerIntents, offerPrices: _offerPrices, offerDeliveryTimes: _offerDeliveryTimes, offerStatuses: _offerStatuses, offerCount: _offerCount, intentCleanupCursor: _intentCleanupCursor, agentActiveIntents: _agentActiveIntents, maxIntentsPerAgent: _maxIntentsPerAgent, storageFund: _storageFund, accumulatedFees: _accumulatedFees };
}

export function storeTupleReputation$Data(source: Reputation$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.owner);
    builder.writeNumber(source.fee);
    builder.writeNumber(source.agentCount);
    builder.writeCell(source.agentOwners.size > 0 ? beginCell().storeDictDirect(source.agentOwners, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.agentAvailable.size > 0 ? beginCell().storeDictDirect(source.agentAvailable, Dictionary.Keys.Uint(32), Dictionary.Values.Bool()).endCell() : null);
    builder.writeCell(source.agentTotalTasks.size > 0 ? beginCell().storeDictDirect(source.agentTotalTasks, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.agentSuccesses.size > 0 ? beginCell().storeDictDirect(source.agentSuccesses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.agentRegisteredAt.size > 0 ? beginCell().storeDictDirect(source.agentRegisteredAt, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.agentLastActive.size > 0 ? beginCell().storeDictDirect(source.agentLastActive, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.nameToIndex.size > 0 ? beginCell().storeDictDirect(source.nameToIndex, Dictionary.Keys.BigUint(256), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.capabilityIndex.size > 0 ? beginCell().storeDictDirect(source.capabilityIndex, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell()).endCell() : null);
    builder.writeCell(source.openDisputes.size > 0 ? beginCell().storeDictDirect(source.openDisputes, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.disputeDepositors.size > 0 ? beginCell().storeDictDirect(source.disputeDepositors, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.disputeBeneficiaries.size > 0 ? beginCell().storeDictDirect(source.disputeBeneficiaries, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.disputeAmounts.size > 0 ? beginCell().storeDictDirect(source.disputeAmounts, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.disputeDeadlines.size > 0 ? beginCell().storeDictDirect(source.disputeDeadlines, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.disputeSettled.size > 0 ? beginCell().storeDictDirect(source.disputeSettled, Dictionary.Keys.Uint(32), Dictionary.Values.Bool()).endCell() : null);
    builder.writeNumber(source.disputeCount);
    builder.writeNumber(source.cleanupCursor);
    builder.writeCell(source.intents.size > 0 ? beginCell().storeDictDirect(source.intents, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.intentServiceHashes.size > 0 ? beginCell().storeDictDirect(source.intentServiceHashes, Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256)).endCell() : null);
    builder.writeCell(source.intentBudgets.size > 0 ? beginCell().storeDictDirect(source.intentBudgets, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.intentDeadlines.size > 0 ? beginCell().storeDictDirect(source.intentDeadlines, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.intentStatuses.size > 0 ? beginCell().storeDictDirect(source.intentStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8)).endCell() : null);
    builder.writeCell(source.intentAcceptedOffer.size > 0 ? beginCell().storeDictDirect(source.intentAcceptedOffer, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeNumber(source.intentCount);
    builder.writeCell(source.intentsByService.size > 0 ? beginCell().storeDictDirect(source.intentsByService, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell()).endCell() : null);
    builder.writeCell(source.offers.size > 0 ? beginCell().storeDictDirect(source.offers, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.offerIntents.size > 0 ? beginCell().storeDictDirect(source.offerIntents, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.offerPrices.size > 0 ? beginCell().storeDictDirect(source.offerPrices, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.offerDeliveryTimes.size > 0 ? beginCell().storeDictDirect(source.offerDeliveryTimes, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.offerStatuses.size > 0 ? beginCell().storeDictDirect(source.offerStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8)).endCell() : null);
    builder.writeNumber(source.offerCount);
    builder.writeNumber(source.intentCleanupCursor);
    builder.writeCell(source.agentActiveIntents.size > 0 ? beginCell().storeDictDirect(source.agentActiveIntents, Dictionary.Keys.Address(), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeNumber(source.maxIntentsPerAgent);
    builder.writeNumber(source.storageFund);
    builder.writeNumber(source.accumulatedFees);
    return builder.build();
}

export function dictValueParserReputation$Data(): DictionaryValue<Reputation$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeReputation$Data(src)).endCell());
        },
        parse: (src) => {
            return loadReputation$Data(src.loadRef().beginParse());
        }
    }
}

 type Reputation_init_args = {
    $$type: 'Reputation_init_args';
    owner: Address;
}

function initReputation_init_args(src: Reputation_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.owner);
    };
}

async function Reputation_init(owner: Address) {
    const __code = Cell.fromHex('b5ee9c724102b0010038b400022cff008e88f4a413f4bcf2c80bed53208e8130e1ed43d901460202710222020120030b02012004090202760507033da71bda89a1a400031d0ff4800203a3b679c61bb678ae20be1eae20be1ed8c347490600045614033da715da89a1a400031d0ff4800203a3b679c61bb678ae20be1eae20be1ed8c3474908000220033fb7a7bda89a1a400031d0ff4800203a3b679c61bb678ae20be1eae20be1ed8c3047490a000456230201200c0f03f3b7431da89a1a400031d0ff4800203a3b679c61a224a224c224a2248224a2248224622482246224422462244224222442242224022422240223e2240223e223c223e223c223a223c223a2238223a2238223622382236223422362234223222342232223022322230222e2230222e222c222e222c222a222c222b047490d01601114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c610e002c8307561e0280204133f40e6fa19401d70130925b6de20201201020020120111403f3ad98f6a268690000c743fd200080e8ed9e7186889288930892889208928892089188920891889108918891089088910890889008908890088f8890088f888f088f888f088e888f088e888e088e888e088d888e088d888d088d888d088c888d088c888c088c888c088b888c088b888b088b888b088a888b088ac047491201601114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c6113001c8307561d0259f40f6fa192306ddf020148151c020120161a03f1a033b513434800063a1fe9000407476cf38c34449444984494449044944490448c4490448c4488448c4488448444884484448044844480447c4480447c4478447c4478447444784474447044744470446c4470446c4468446c4468446444684464446044644460445c4460445c4458445c4458445444584456474917018c1114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c61206e92306d99206ef2d0806f256f05e2206e92306dde1801de20c100917f94205625bee292306de0562380202259f40e6fa192306ddf206e925b6de080202056245422434133f40e6fa19401d70130925b6de280202056245422534133f40e6fa19401d70130925b6de280202056245422634133f40e6fa19401d70130925b6de2802056274016711900a64133f40e6fa19401d70030925b6de203206ef2d080236eb39603206ef2d080923370e2226eb39602206ef2d080923270e2216eb39601206ef2d080923170e2246eb39604206ef2d080923470e2103441306f050335a3abb513434800063a1fe9000407476cf38c376cf1b311b311b39247491b00365623a7032daa00a0208100f0a87021c20095305330a904de24552003f1a701da89a1a400031d0ff4800203a3b679c61a224a224c224a2248224a2248224622482246224422462244224222442242224022422240223e2240223e223c223e223c223a223c223a2238223a2238223622382236223422362234223222342232223022322230222e2230222e222c222e222c222a222c222b47491d01581114111511141113111411131112111311121111111211111110111111100f11100f550edb3c6ce76ce76ca71e01ea561380202259f40e6fa192306ddf206ef2d0805610802023784133f40e6fa19401d70130925b6de2206ef2d08080202056145422534133f40e6fa19401d70130925b6de2206ef2d0807080202056145422734133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e2561680202683071f00804133f40e6fa19401d70130925b6de2206ef2d0808020561740178101014133f40e6fa19401d70030925b6de2206ef2d08023c00094f82323be9170e210564440033fb1aafb513434800063a1fe9000407476cf38c376cf15c417c3d5c417c3db1860474921000221020120233b020120243502012025320201202628033facaf76a268690000c743fd200080e8ed9e7186ed9e2b882f87ab882f87b630c047492700022c020148292e03f1a785da89a1a400031d0ff4800203a3b679c61a224a224c224a2248224a2248224622482246224422462244224222442242224022422240223e2240223e223c223e223c223a223c223a2238223a2238223622382236223422362234223222342232223022322230222e2230222e222c222e222c222a222c222b47492a015c1114111511141113111411131112111311121111111211111110111111100f11100f550edb3c6caa6caa6caa6c8a2b01f6562380202259f40e6fa192306ddf6e99707054700053007021e07080202056245422434133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27080202056245422534133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27022c2009630a76421a9049131e27080202056245422632c01f84133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27080202056245422734133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27021c2009b30f82321a182015180a904de7023c2009b30f82323a182015180a904de7026c2639325c1149170e2923071de20c0009323c2009170e22d00809af82324a18208278d00bc9170e2923072de20c0009326c0009170e29324c2009170e29af82325a18208093a80bc9170e2923073de7f21c2001850060504431303f1a41bda89a1a400031d0ff4800203a3b679c61a224a224c224a2248224a2248224622482246224422462244224222442242224022422240223e2240223e223c223e223c223a223c223a2238223a2238223622382236223422362234223222342232223022322230222e2230222e222c222e222c222a222c222b47492f01581114111511141113111411131112111311121111111211111110111111100f11100f550edb3c6cf56cf56c853001f02b80202259f40e6fa192306ddf206ef2d0808020545c0052404133f40e6fa19401d70130925b6de2206ef2d0802b8020248101014133f40e6fa19401d70030925b6de2206ef2d0808020545c0052604133f40e6fa19401d70130925b6de2206ef2d0808020544c16784133f40e6fa19401d70130925b6de2310012206ef2d0801034413003f3b30dbb513434800063a1fe9000407476cf38c34449444984494449044944490448c4490448c4488448c4488448444884484448044844480447c4480447c4478447c4478447444784474447044744470446c4470446c4468446c4468446444684464446044644460445c4460445c4458445c4458445444584456047493301601114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c6134001a83072d0259f40f6fa192306ddf0201203638033fb3a37b513434800063a1fe9000407476cf38c376cf15c417c3d5c417c3db18604749370008f8276f1003f3b0357b513434800063a1fe9000407476cf38c34449444984494449044944490448c4490448c4488448c4488448444884484448044844480447c4480447c4478447c4478447444784474447044744470446c4470446c4468446c4468446444684464446044644460445c4460445c4458445c4458445444584456047493901601114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c613a00c820c100917f94205625bee2923070e080202056235422334133f40e6fa19401d70130925b6de2206e917f9820206ef2d080c000e2925b70e080202056230350444133f40e6fa19401d70130925b6de2206e925b70e0206ef2d080a76401206ef2d080a9040201203c4402016a3d4103f2ab3eed44d0d200018e87fa400101d1db3ce30d112511261125112411251124112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a111911181119111811171118111711161117111611151116111547493e018c1114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c61206e92306d99206ef2d0806f266f06e2206e92306dde3f01f620c100917f94205616bee292306de0561b80202259f40e6fa192306ddf206e925b6de05617802023714133f40e6fa19401d70030925b6de201206ef2d080561c80202459f40e6fa192306ddf206ef2d080561c80202559f40e6fa192306ddf206ef2d080561c8020268101014133f40e6fa19401d70030925b6de240006c206ef2d080802020561e0350884133f40e6fa19401d70130925b6de2206ef2d080246eb39604206ef2d080923470e210354430126f0603f2a9b4ed44d0d200018e87fa400101d1db3ce30d112511261125112411251124112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a111911181119111811171118111711161117111611151116111547494201601114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f6c6143004681010b25028101014133f40a6fa19401d70030925b6de2206eb395206ef2d080e03070033fb42a3da89a1a400031d0ff4800203a3b679c61bb678ae20be1eae20be1ed8c30474945000225049801d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018e87fa400101d1db3ce30d1127965f0f5f0f5f09e01125d70d1ff2e08221821038a0a307bae302218210a7262e8eba47494d5301f26d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d82089896807054700053007a5311091124090811230809112209081121080911200908111f0809111e0908111d0809111c0908111b0809111a0908111908091118090811170809111609081115080711140706111306091112090811110848003007111007106f109e108d105c107b106a105710561045103402f8db3c5726112411251124112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211114a4c01f4fa40fa00d31ff404d401d0f404f404f404d430d0f404f404f404d430d0f404f404f404d430d0f404f404f404d430d0f404d31fd31ff404f404d430d0f404f404f404d430d0f404d31ff404f404d430d0f404f404f404d430d0f404d31fd31ff404d307fa00fa00301122112611221122112511221122112411224b000c11221123112200181110111111100f11100f550e03f631d401d001d431d200308160adf8416f24135f035626bef2f4019b9320d74a91d5e868f90400da11561c83072280204133f40e6fa19401d70130925b6de2206eb3e30f112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111d111a111c111a4e4f5100d431206ef2d080562280202259f40e6fa192306ddf817b16216eb39bf84202206ef2d08012c705923170e2f2f40111210180205110112371216e955b59f45b3098c801cf004133f443e28020f8232104111f04102302112302216e955b59f45b3098c801cf014133f443e201fe3056238020f84202112502562501206e953059f45b30944133f416e2011122018020015624500471216e955b59f45b3098c801cf004133f443e28020702103112303562559216e955b59f45b3098c801cf014133f443e28020702103112203562559216e955b59f45b3098c801cf014133f443e28020f823210311210356255000e659216e955b59f45b3098c801cf014133f443e28020f8232103112003562559216e955b59f45b3098c801cf014133f443e202111c028307020111220111238020216e955b59f45b3098c801cf014133f443e21121a41121111e111f111e111d111e111d111c111d111c111b111c111b111a111b03fc1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a1079106810571046103544301272db3c018208e4e1c0a0015624a05ca08208989680a070fb02f8427081008270887fa75201e210246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00c87f01ca001126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54ae02fc8efa31d401d001d200308160adf8416f24135f035626bef2f4019b9320d74a91d5e868f90400da118307561d0280204133f40e6fa19401d70130925b6de2816cce216eb3f2f4206ef2d08080202056225422334133f40e6fa19401d70130925b6de2206e95816ccef2f0de802001206ef2d080a42103112303562359e021545701fc216e955b59f45b3098c801cf014133f443e2018e3b802053005621595623014133f40e6fa19401d70130925b6de2206ef2d080a42103112103562259216e955b59f45b3098c801cf014133f443e2111ede8020f8232104111f04102302112202216e955b59f45b3098c801cf014133f443e21123112511231122112411225501fc112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111d111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10795603c6106810571046103544301271db3c0182082dc6c0a0015624a05ca08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb007fa7ad044a821054e26a4bbae302218210148534b8bae3022182108711bf6fbae3022182102f7e5059ba585c606201fc31d401d001d20030019b9320d74a91d5e868f90400da118307561d0280204133f40e6fa19401d70130925b6de2816cce216eb3f2f4206ef2d080562280202259f40e6fa192306ddf820097a4216eb39bf84202206ef2d08012c705923170e2f2f40111210180205110112371216e955b59f45b3098c801cf004133f443e25902f68020f8232104111f04102302112302216e955b59f45b3098c801cf014133f443e2112482082dc6c0a0205626a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112311251123a75a01fc112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111c111d111c111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce5b019e10bd10ac109b108a10791068105710461035440302c87f01ca001126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54ae01f831d31fd3ff30562280202359f40e6fa192306ddf816cce216eb3f2f4811bd6f84202206ef2d08012c705f2f48020f82321031120032459216e955b59f45b3098c801cf014133f443e2561b8307561f59f40f6fa192306ddfc813cb1f226eb39c7101cb0002206ef2d08058cc95327058cb00e2830701c903111c03125d02fc01111e01206e953059f45b30944133f417e2112482084c4b40a0205626a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112311251123112211241122112111231121112011221120a75e01fc111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a111a111b111a1118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a107910681057104610355f017a440302c87f01ca001126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54ae01fe31d3073020c23293308032de20c101923071de112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511136103fe1112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443012db3c5ca08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb007fa7ad02fe8efc31fa40fa40fa40fa00d31f3001111d0180200156185006206e953059f45b30944133f416e201111b0180200156175004206e953059f45b30944133f416e201111901802001561601111c206e953059f45b30944133f416e201111701802001561501111c810101216e955b59f45b3098c801cf004133f443e2802020e0636603fe0311170312561502111901216e955b59f45b3098c801cf014133f443e21113802056137071216e955b59f45b3098c801cf004133f443e21112a4112482084c4b40a0205626a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf818ae2f400c901a76c6401fcfb00112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191116111a11161117111911171115111711151113111611131112111511121113111411131111111311111110111211100f11110f0e11100e10df6501a210ce10bd10ac109b108a10791068105710461035440302c87f01ca001126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54ae044c218210bfa05986bae3022182102365d020bae302218210966dc6edbae3022182106d5af6a7ba676a6f9302fe31fa40307094205615b98e3e561a80202259f40e6fa192306ddf206eb398206ef2d08022c705923070e28e1c1115802056167f71216e955b59f45b3098c801cf004133f443e21115dea4e85b112482082dc6c0a0205626a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069a76801f6cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711156901f01114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a107910681057104610354403c87f01ca001126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54ae03fe5b8168c9f8425625c705f2f45621a7032baa00a08100f0a870218e1b21c2008e13562622a904c2149830a71411255625a19131e29131e2945b701125e201112601a082009ebc2182084c4b40bcf2f47072708856270405552010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf818ae2f4006b6c6d002400000000466565732077697468647261776e001a58cf8680cf8480f400f400cf8101f8c901fb00112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211106e01b60f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443012c87f01ca001126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54ae02fe31d3fffa00d31f30811127f8235220bcf2f48159c222c200f2f47081010bf84227598101014133f40a6fa19401d70030925b6de2206eb39631206ef2d0809130e25304bee3008020f84202111602561001206e953059f45b30944133f416e21113802053f48307216e955b59f45b3098c801cf014133f443e2011112018020707701f4f842112611281126112511271125112411281124112311271123112211281122112111271121112011281120111f1127111f111e1128111e111d1127111d111c1128111c111b1127111b111a1128111a1119112711191118112811181117112711171116112811161115112711151114112811141113112711137102fa1112112811121111112711111110112811100f11270f0e11280e0d11270d0c11280c0b11270b0a11280a091127090811280807112707061128060511270504112804031127030211290201112a01db3c8e2a572981010bf84224598101014133f40a6fa19401d70030925b6de2206eb395206ef2d080923070e21129de7275012ceda2edfb70209a21c13293530fb99170e28ae85f03707302fe561580202259f40e6fa192306ddf5612802023784133f40e6fa19401d70130925b6de2216eb39901206ef2d08024c705923170e293206eb39170e297206ef2d080c000923070e28eb280202056145422334133f40e6fa19401d70130925b6de2206eb399f82301206ef2d080be923070e28e876c21db3c7fdb31e0dea401a4897400020101f6811d38562a24b9f2f4112901112801112511271125112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611147600701113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035102401f65420f4810101216e955b59f45b3098c801cf004133f443e280202003111203544f13111401216e955b59f45b3098c801cf014133f443e20e80202d7078216e955b59f45b3098c801cf014133f443e22ca481010bf8421115a410361201111501810101216e955b59f4593098c801cf004133f441e21125112711257801fc112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131111111411115e3f0e11110e0311100310df79046c103e10bd10ac109b108a1079106810571046451504db3cdb3c71db3c018208989680a05301a08208989680a070fb02f84270810082707a7b7f92007a2d83072359f40f6fa192306ddfc812cb1f216eb39c7101cb0001206ef2d08001cc947032cb00e2830701c9103e12206e953059f45b30944133f417e20b01eaeda2edfb24709a20c10593531eb99170e28ed55610802023784133f40e6fa19401d70130925b6de2206eb397206ef2d080c000923070e28eaa80202056135422434133f40e6fa19401d70130925b6de2206eb399f82301206ef2d080be923070e2e302de01a401a4e83035534cbe9234709104e2047c01fe30112511261125112411261124112311261123112211261122112111261121112011261120111f1126111f111e1126111e111d1126111d111c1126111c111b1126111b111a1126111a1119112611191118112611181117112611171116112611161115112611151114112611141113112611131112112611121111112611117d02fe1110112611100f11260f0e11260e0d11260d0c11260c0b11260b0a11260a09112609112608070655405626db3c341125a4112411251124112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a1119111811191118897e009c1117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f10ef10de10cd10bc10ab109a108910781067105604415503db310188702056168e1221c10a94205628b99170e2935323b99170e28e96562680202259f40e6fa192306ddf6eb3e300a401a401e857175f0356135624be93571370921113e211138001fc7080202056275422434133f40e6fa19401d70130925b6de280202056275422534133f40e6fa19401d70130925b6de280202056265422634133f40e6fa19401d70130925b6de280202056285422734133f40e6fa19401d70130925b6de270246eb3983003206ef2d080039134e270236eb3983002206ef2d080029133e2238101ecc2639c02a76423a904c114927f34de9132e223b393206eb39170e29820206ef2d080c2009170e28e13f82301206ef2d080a18208278d00bc927f33de9130e222b39301c000923170e293206eb39170e29820206ef2d080c2009170e28e13f82301206ef2d080a18208093a80bc92307fde9130e2e3008201fc112511291125112411281124112311271123112211261122112111291121112011281120111f1127111f111e1126111e111d1129111d111c1128111c111b1127111b111a1126111a1119112911191118112811181117112711171116112611161115112911151114112811141113112711131112112611121111112911118302f61110112811100f11270f0e11260e0d11290d0c11280c0b11270b0a11260a09112909081128080711270706112606051129050411280403112703021126020111290111285628db3c1126a4112511291125112411281124112311271123112211261122112111251121112011241120111f1123111f111e1122111e849101f6562380202259f40e6fa192306ddf11248020226d206e953059f45b30944133f416e211238020226d71216e955b59f45b3098c801cf004133f443e280206d21031125032459216e955b59f45b3098c801cf014133f443e280206d21031124032459216e955b59f45b3098c801cf014133f443e280206d21031123038501b62459216e955b59f45b3098c801cf014133f443e280206d2104112204102302112202216e955b59f45b3098c801cf014133f443e256236eb3925723e30d112111221121112011211120111f1120111f111e111f111e111d111e111d8603fe70209a531fb99320c1149170e28ed2561580202359f40e6fa192306ddf5612802024784133f40e6fa19401d70130925b6de2216eb39f01206ef2d0805627206ef2d080c705923170e293206eb39170e297206ef2d080c000923070e2e30001a401e85b70209a5318b99320c11e9170e28ae85b81010b1124206ef2d0801025878f9001fc112511281125112411271124112311261123112211271122112111261121112011271120111f1126111f111e1127111e02111d02111c1126111c111b1127111b02111a021119112611191118112711180211170211161126111611151127111502111402111311261113111211271112021111021110112611100f11270f8802fa102e0d11260d0c11270c102b0a11260a0911270910280711260706112706102504112604031127030111260111275626db3c1127a4112511281125112411271124112311261123112211241122112111231121112011221120111f1121111f111e1120111e111c111f111c111b111e111b111a111d111a1119111c1119898e02cc2f802022784133f40e6fa19401d70130925b6de2206e92307f97206ef2d080c300e29130e0561380202259f40e6fa192306ddf11108020227478216e955b59f45b3098c801cf014133f443e256106eb3925710e30d70209a5318b99320c1149170e28ae85f038a8d01fe1110206ef2d080112611271126112511271125112411271124112311271123112211271122112111271121112011271120111f1127111f111e1127111e111d1127111d111c1127111c111b1127111b111a1127111a1119112711191118112711181117112711171116112711161115112711151114112711141113112711138b02f41112112711121111112711111110112711100f11270f0e11270e0d11270d0c11270c0b11270b0a11270a091127090811270807112707061127060511270504112704031127030211270201112701db3c112511261125112411251124112311241123112211231122112111221121112011211120111f1120111fa58c00c0111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550e00da8020545d0052404133f40e6fa19401d70130925b6de22a802024784133f40e6fa19401d70130925b6de2216eb39801206ef2d08024ba923170e293206eb39170e297206ef2d080c000923070e28e1a098020227378216e955b59f45b3098c801cf014133f443e209a4de01a40100b01118111b11181117111a11171116111911161115111811151114111711141113111611131112111511121111111411111110111311100f11120f0e11110e0d11100d10cf10be10ad109c108b107a1069105810471036454000d62d80202359f40e6fa192306ddf2a802024784133f40e6fa19401d70130925b6de2216eb39f01206ef2d0805627206ef2d080c705923170e293206eb39170e297206ef2d080c000923070e28e1a098020227378216e955b59f45b3098c801cf014133f443e209a4de01a4010036011124016d810101216e955b59f4593098c801cf004133f441e20300f4111d1121111d111c1120111c111b111f111b111a111e111a1119111d11191118111c11181117111b11171116111a11161115111911151114111811141113111711131112111611121111111511111110111411100f11130f0e11120e0d11110d0c11100c10bf10ae109d108c107b106a1059104810374016505402e68810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0001c87f01ca001126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54a7ae043ce3022182103785158dbae3022182101ce33d8ebae3022182103b9b249eba94999fa201fc31d31ffa00d31f302f802024784133f40e6fa19401d70130925b6de2813404216eb3f2f481680001206ef2d080c000f2f480202056125422534133f40e6fa19401d70130925b6de28200bc90216eb39af82302206ef2d08012b9923170e2f2f456118020248101014133f40e6fa19401d70030925b6de282008b73216eb39501e69901206ef2d0805230bb923170e2f2f4561380202459f40e6fa192306ddf820087fa216eb39cf84202206ef2d08012c705b3923170e2f2f48020f84228103e01206e953059f45b30944133f416e2802020103c5448135055216e955b59f45b3098c801cf014133f443e218802054206b8101019602fe216e955b59f45b3098c801cf004133f443e2802020103854461350cc216e955b59f45b3098c801cf014133f443e2048020247078216e955b59f45b3098c801cf014133f443e203a4112482084c4b40a0205626a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025ca79701fa6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611149801de1113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b5e36104710361035440302c87f01ca001126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54ae01f631d31f3025802022784133f40e6fa19401d70130925b6de28200c723216eb3f2f48200b1bf01206ef2d080c000f2f4802054590052304133f40e6fa19401d70130925b6de282009d3e216eb3f2f4802021206ef2d08056145959f40e6fa192306ddf815730216eb39af84222206ef2d080c7059170e2f2f48020229a01f8206ef2d080561159784133f40e6fa19401d70130925b6de2816800216eb39801206ef2d080c000923170e2f2f4802022206ef2d08021561355204133f40e6fa19401d70130925b6de28200bc90216eb39af82302206ef2d08012b9923170e2f2f4078020237178216e955b59f45b3098c801cf014133f443e28020229b03fe206ef2d080021111027178216e955b59f45b3098c801cf014133f443e2802022206ef2d08021031111035250216e955b59f45b3098c801cf014133f443e2276eb38e9e07206ef2d08010ef107e0211270201112801db3c112701112601106e106d9137e270935306b98ae85f03112482082dc6c0a0205626a08208989680a0a59c9d00ee5302bd8e708020545b0052304133f40e6fa19401d70130925b6de25610802023784133f40e6fa19401d70130925b6de2216eb39d01206ef2d08023206ef2d080ba923170e293206eb39170e297206ef2d080c000923070e28e1a0f802056107278216e955b59f45b3098c801cf014133f443e20fdedea402fc70fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111aa79e01b61119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10be104d10ac109b108a1079106810571035440302ad01fe31d31f302d802022784133f40e6fa19401d70130925b6de2813404216eb3f2f482009b6f01206ef2d080c001f2f4561180202259f40e6fa192306ddf815730216eb39bf84202206ef2d08012c705923170e2f2f41d8020017278216e955b59f45b3098c801cf014133f443e2112482082dc6c0a0205626a08208989680a070a002fafb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111aa7a101b41119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10bd10ac109b108a107910681057104610354403ad02fc8efa31d31f302d802022784133f40e6fa19401d70130925b6de2813404216eb3f2f48200cd2501206ef2d080c000f2f4561180202259f40e6fa192306ddf815730216eb39bf84202206ef2d08012c705923170e2f2f40d80202e7378216e955b59f45b3098c801cf014133f443e2f842112511261125112411251124e001a3a901fe112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f1f10dea404fc10cd10bc10ab109a108910781067105610451034413001112701db3c70935306b98ae830572682082dc6c0a0205626a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00112411251124a5a6a7a8009c2481010b228101014133f40a6fa19401d70030925b6de2206eb39820206ef2d080c2009170e28e2381010b01206ef2d080a5103612810101216e955b59f4593098c801cf004133f441e203915be200d68020545b0052304133f40e6fa19401d70130925b6de228802023784133f40e6fa19401d70130925b6de2216eb39901206ef2d0805629ba923170e293206eb39170e297206ef2d080c000923070e28e19078020287278216e955b59f45b3098c801cf014133f443e207dea400140000000045786365737301fc112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550ead01248210946a98b6bae3025f0f5f0f5f09f2c082aa01fad33f30c8018210aff90f5758cb1fcb3fc9112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a1118111711191117111611181116111511171115111411161114111311151113ab01661112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443012ac01c6f84270f8276f10f8416f24135f03a1820afaf080b98e29820afaf08070fb0270500381008201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb008e20705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00e2ad0174c87f01ca001126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54ae01f4011125011126ce011123fa0201112101cb1f01111f01f400111dc8f40001111c01f40001111a01f4001118c8f40001111701f40001111501f4001113c8f40001111201f40001111001f4000ec8f4001df4001bf40009c8f40018cb1f16cb1f14f40012f40001c8f40012f40012f40002c8f40014cb1f14f40015af0066f40005c8f40017f40017f40008c8f40019cb1f1acb1f1af4001acb07500afa02500afa0212cd15cd17cd15cdcd14cdcd12cdcd186a4542');
    const builder = beginCell();
    builder.storeUint(0, 1);
    initReputation_init_args({ $$type: 'Reputation_init_args', owner })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const Reputation_errors = {
    2: { message: "Stack underflow" },
    3: { message: "Stack overflow" },
    4: { message: "Integer overflow" },
    5: { message: "Integer out of expected range" },
    6: { message: "Invalid opcode" },
    7: { message: "Type check error" },
    8: { message: "Cell overflow" },
    9: { message: "Cell underflow" },
    10: { message: "Dictionary error" },
    11: { message: "'Unknown' error" },
    12: { message: "Fatal error" },
    13: { message: "Out of gas error" },
    14: { message: "Virtualization error" },
    32: { message: "Action list is invalid" },
    33: { message: "Action list is too long" },
    34: { message: "Action is invalid or not supported" },
    35: { message: "Invalid source address in outbound message" },
    36: { message: "Invalid destination address in outbound message" },
    37: { message: "Not enough Toncoin" },
    38: { message: "Not enough extra currencies" },
    39: { message: "Outbound message does not fit into a cell after rewriting" },
    40: { message: "Cannot process a message" },
    41: { message: "Library reference is null" },
    42: { message: "Library change action error" },
    43: { message: "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree" },
    50: { message: "Account state size exceeded limits" },
    128: { message: "Null reference exception" },
    129: { message: "Invalid serialization prefix" },
    130: { message: "Invalid incoming message" },
    131: { message: "Constraints error" },
    132: { message: "Access denied" },
    133: { message: "Contract stopped" },
    134: { message: "Invalid argument" },
    135: { message: "Code of a contract was not found" },
    136: { message: "Invalid standard address" },
    138: { message: "Not a basechain address" },
    4391: { message: "Deadline must be in the future" },
    7126: { message: "Not the agent owner" },
    7480: { message: "Max intents reached. Cancel or wait for expiration." },
    13316: { message: "Intent not found" },
    22320: { message: "Not the intent owner" },
    22978: { message: "Budget must be positive" },
    24749: { message: "Insufficient fee. Send at least 0.01 TON." },
    26624: { message: "Intent not open" },
    26825: { message: "Only owner can withdraw" },
    27854: { message: "Agent not found" },
    31510: { message: "Only the agent owner can update" },
    34810: { message: "Cannot offer on own intent" },
    35699: { message: "Price exceeds budget" },
    38820: { message: "Only the agent owner can update availability" },
    39791: { message: "Intent not in accepted state" },
    40254: { message: "Offer has no intent" },
    40636: { message: "Nothing to withdraw" },
    45503: { message: "Offer not pending" },
    48272: { message: "Intent expired" },
    50979: { message: "Offer not found" },
    52517: { message: "Can only cancel open intents" },
} as const

export const Reputation_errors_backward = {
    "Stack underflow": 2,
    "Stack overflow": 3,
    "Integer overflow": 4,
    "Integer out of expected range": 5,
    "Invalid opcode": 6,
    "Type check error": 7,
    "Cell overflow": 8,
    "Cell underflow": 9,
    "Dictionary error": 10,
    "'Unknown' error": 11,
    "Fatal error": 12,
    "Out of gas error": 13,
    "Virtualization error": 14,
    "Action list is invalid": 32,
    "Action list is too long": 33,
    "Action is invalid or not supported": 34,
    "Invalid source address in outbound message": 35,
    "Invalid destination address in outbound message": 36,
    "Not enough Toncoin": 37,
    "Not enough extra currencies": 38,
    "Outbound message does not fit into a cell after rewriting": 39,
    "Cannot process a message": 40,
    "Library reference is null": 41,
    "Library change action error": 42,
    "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree": 43,
    "Account state size exceeded limits": 50,
    "Null reference exception": 128,
    "Invalid serialization prefix": 129,
    "Invalid incoming message": 130,
    "Constraints error": 131,
    "Access denied": 132,
    "Contract stopped": 133,
    "Invalid argument": 134,
    "Code of a contract was not found": 135,
    "Invalid standard address": 136,
    "Not a basechain address": 138,
    "Deadline must be in the future": 4391,
    "Not the agent owner": 7126,
    "Max intents reached. Cancel or wait for expiration.": 7480,
    "Intent not found": 13316,
    "Not the intent owner": 22320,
    "Budget must be positive": 22978,
    "Insufficient fee. Send at least 0.01 TON.": 24749,
    "Intent not open": 26624,
    "Only owner can withdraw": 26825,
    "Agent not found": 27854,
    "Only the agent owner can update": 31510,
    "Cannot offer on own intent": 34810,
    "Price exceeds budget": 35699,
    "Only the agent owner can update availability": 38820,
    "Intent not in accepted state": 39791,
    "Offer has no intent": 40254,
    "Nothing to withdraw": 40636,
    "Offer not pending": 45503,
    "Intent expired": 48272,
    "Offer not found": 50979,
    "Can only cancel open intents": 52517,
} as const

const Reputation_types: ABIType[] = [
    {"name":"DataSize","header":null,"fields":[{"name":"cells","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bits","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refs","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SignedBundle","header":null,"fields":[{"name":"signature","type":{"kind":"simple","type":"fixed-bytes","optional":false,"format":64}},{"name":"signedData","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounceable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"MessageParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"DeployParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"init","type":{"kind":"simple","type":"StateInit","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"BasechainAddress","header":null,"fields":[{"name":"hash","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"Register","header":950051591,"fields":[{"name":"name","type":{"kind":"simple","type":"string","optional":false}},{"name":"capabilities","type":{"kind":"simple","type":"string","optional":false}},{"name":"available","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"Rate","header":2804297358,"fields":[{"name":"agentName","type":{"kind":"simple","type":"string","optional":false}},{"name":"success","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"UpdateAvailability","header":1424124491,"fields":[{"name":"name","type":{"kind":"simple","type":"string","optional":false}},{"name":"available","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"Withdraw","header":593874976,"fields":[]},
    {"name":"IndexCapability","header":344274104,"fields":[{"name":"agentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"capabilityHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"TriggerCleanup","header":2266087279,"fields":[{"name":"maxClean","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"NotifyDisputeOpened","header":796807257,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"depositor","type":{"kind":"simple","type":"address","optional":false}},{"name":"beneficiary","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"votingDeadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"NotifyDisputeSettled","header":3214956934,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"released","type":{"kind":"simple","type":"bool","optional":false}},{"name":"refunded","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"BroadcastIntent","header":2523776749,"fields":[{"name":"serviceHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"budget","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"SendOffer","header":1834677927,"fields":[{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"price","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deliveryTime","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"AcceptOffer","header":931468685,"fields":[{"name":"offerIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"CancelIntent","header":1000023198,"fields":[{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"SettleDeal","header":484654478,"fields":[{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"rating","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"AgentData","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"available","type":{"kind":"simple","type":"bool","optional":false}},{"name":"totalTasks","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"successes","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"registeredAt","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"DisputeInfo","header":null,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"depositor","type":{"kind":"simple","type":"address","optional":false}},{"name":"beneficiary","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"votingDeadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"settled","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"AgentCleanupInfo","header":null,"fields":[{"name":"index","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"exists","type":{"kind":"simple","type":"bool","optional":false}},{"name":"score","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"totalRatings","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"registeredAt","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"lastActive","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"daysSinceActive","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"daysSinceRegistered","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"eligibleForCleanup","type":{"kind":"simple","type":"bool","optional":false}},{"name":"cleanupReason","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"IntentData","header":null,"fields":[{"name":"buyer","type":{"kind":"simple","type":"address","optional":false}},{"name":"serviceHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"budget","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"status","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"acceptedOffer","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"isExpired","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"OfferData","header":null,"fields":[{"name":"seller","type":{"kind":"simple","type":"address","optional":false}},{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"price","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deliveryTime","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"status","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"StorageInfo","header":null,"fields":[{"name":"storageFund","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalCells","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"annualCost","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"yearsCovered","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"Reputation$Data","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"fee","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"agentCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"agentOwners","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"agentAvailable","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"bool"}},{"name":"agentTotalTasks","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"agentSuccesses","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"agentRegisteredAt","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"agentLastActive","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"nameToIndex","type":{"kind":"dict","key":"uint","keyFormat":256,"value":"uint","valueFormat":32}},{"name":"capabilityIndex","type":{"kind":"dict","key":"uint","keyFormat":256,"value":"cell","valueFormat":"ref"}},{"name":"openDisputes","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"disputeDepositors","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"disputeBeneficiaries","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"disputeAmounts","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"int"}},{"name":"disputeDeadlines","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"disputeSettled","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"bool"}},{"name":"disputeCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"cleanupCursor","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"intents","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"intentServiceHashes","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":256}},{"name":"intentBudgets","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"int"}},{"name":"intentDeadlines","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"intentStatuses","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":8}},{"name":"intentAcceptedOffer","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"intentCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"intentsByService","type":{"kind":"dict","key":"uint","keyFormat":256,"value":"cell","valueFormat":"ref"}},{"name":"offers","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"offerIntents","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"offerPrices","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"int"}},{"name":"offerDeliveryTimes","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"offerStatuses","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":8}},{"name":"offerCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"intentCleanupCursor","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"agentActiveIntents","type":{"kind":"dict","key":"address","value":"int"}},{"name":"maxIntentsPerAgent","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"storageFund","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"accumulatedFees","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
]

const Reputation_opcodes = {
    "Deploy": 2490013878,
    "DeployOk": 2952335191,
    "FactoryDeploy": 1829761339,
    "Register": 950051591,
    "Rate": 2804297358,
    "UpdateAvailability": 1424124491,
    "Withdraw": 593874976,
    "IndexCapability": 344274104,
    "TriggerCleanup": 2266087279,
    "NotifyDisputeOpened": 796807257,
    "NotifyDisputeSettled": 3214956934,
    "BroadcastIntent": 2523776749,
    "SendOffer": 1834677927,
    "AcceptOffer": 931468685,
    "CancelIntent": 1000023198,
    "SettleDeal": 484654478,
}

const Reputation_getters: ABIGetter[] = [
    {"name":"agentData","methodId":92172,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"AgentData","optional":true}},
    {"name":"agentIndexByNameHash","methodId":88600,"arguments":[{"name":"nameHash","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"int","optional":true,"format":257}},
    {"name":"agentReputation","methodId":110805,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"agentCount","methodId":81213,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"contractBalance","methodId":110221,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"agentsByCapability","methodId":90929,"arguments":[{"name":"capHash","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"cell","optional":true}},
    {"name":"disputeCount","methodId":72077,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"disputeData","methodId":119614,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"DisputeInfo","optional":true}},
    {"name":"agentCleanupInfo","methodId":100802,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"AgentCleanupInfo","optional":false}},
    {"name":"intentsByServiceHash","methodId":105526,"arguments":[{"name":"serviceHash","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"cell","optional":true}},
    {"name":"intentCount","methodId":98654,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"offerCount","methodId":123217,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"agentIntentQuota","methodId":120244,"arguments":[{"name":"agent","type":{"kind":"simple","type":"address","optional":false}}],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"intentData","methodId":93056,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"IntentData","optional":false}},
    {"name":"offerData","methodId":100877,"arguments":[{"name":"index","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"OfferData","optional":false}},
    {"name":"storageInfo","methodId":92650,"arguments":[],"returnType":{"kind":"simple","type":"StorageInfo","optional":false}},
    {"name":"storageFundBalance","methodId":95915,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"accumulatedFeesBalance","methodId":72586,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
]

export const Reputation_getterMapping: { [key: string]: string } = {
    'agentData': 'getAgentData',
    'agentIndexByNameHash': 'getAgentIndexByNameHash',
    'agentReputation': 'getAgentReputation',
    'agentCount': 'getAgentCount',
    'contractBalance': 'getContractBalance',
    'agentsByCapability': 'getAgentsByCapability',
    'disputeCount': 'getDisputeCount',
    'disputeData': 'getDisputeData',
    'agentCleanupInfo': 'getAgentCleanupInfo',
    'intentsByServiceHash': 'getIntentsByServiceHash',
    'intentCount': 'getIntentCount',
    'offerCount': 'getOfferCount',
    'agentIntentQuota': 'getAgentIntentQuota',
    'intentData': 'getIntentData',
    'offerData': 'getOfferData',
    'storageInfo': 'getStorageInfo',
    'storageFundBalance': 'getStorageFundBalance',
    'accumulatedFeesBalance': 'getAccumulatedFeesBalance',
}

const Reputation_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"Register"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Rate"}},
    {"receiver":"internal","message":{"kind":"typed","type":"UpdateAvailability"}},
    {"receiver":"internal","message":{"kind":"typed","type":"IndexCapability"}},
    {"receiver":"internal","message":{"kind":"typed","type":"TriggerCleanup"}},
    {"receiver":"internal","message":{"kind":"typed","type":"NotifyDisputeOpened"}},
    {"receiver":"internal","message":{"kind":"typed","type":"NotifyDisputeSettled"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Withdraw"}},
    {"receiver":"internal","message":{"kind":"typed","type":"BroadcastIntent"}},
    {"receiver":"internal","message":{"kind":"typed","type":"SendOffer"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AcceptOffer"}},
    {"receiver":"internal","message":{"kind":"typed","type":"SettleDeal"}},
    {"receiver":"internal","message":{"kind":"typed","type":"CancelIntent"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]


export class Reputation implements Contract {
    
    public static readonly storageReserve = 50000000n;
    public static readonly errors = Reputation_errors_backward;
    public static readonly opcodes = Reputation_opcodes;
    
    static async init(owner: Address) {
        return await Reputation_init(owner);
    }
    
    static async fromInit(owner: Address) {
        const __gen_init = await Reputation_init(owner);
        const address = contractAddress(0, __gen_init);
        return new Reputation(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new Reputation(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  Reputation_types,
        getters: Reputation_getters,
        receivers: Reputation_receivers,
        errors: Reputation_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: Register | Rate | UpdateAvailability | IndexCapability | TriggerCleanup | NotifyDisputeOpened | NotifyDisputeSettled | Withdraw | BroadcastIntent | SendOffer | AcceptOffer | SettleDeal | CancelIntent | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Register') {
            body = beginCell().store(storeRegister(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Rate') {
            body = beginCell().store(storeRate(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'UpdateAvailability') {
            body = beginCell().store(storeUpdateAvailability(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'IndexCapability') {
            body = beginCell().store(storeIndexCapability(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'TriggerCleanup') {
            body = beginCell().store(storeTriggerCleanup(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'NotifyDisputeOpened') {
            body = beginCell().store(storeNotifyDisputeOpened(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'NotifyDisputeSettled') {
            body = beginCell().store(storeNotifyDisputeSettled(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Withdraw') {
            body = beginCell().store(storeWithdraw(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'BroadcastIntent') {
            body = beginCell().store(storeBroadcastIntent(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SendOffer') {
            body = beginCell().store(storeSendOffer(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AcceptOffer') {
            body = beginCell().store(storeAcceptOffer(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SettleDeal') {
            body = beginCell().store(storeSettleDeal(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'CancelIntent') {
            body = beginCell().store(storeCancelIntent(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getAgentData(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('agentData', builder.build())).stack;
        const result_p = source.readTupleOpt();
        const result = result_p ? loadTupleAgentData(result_p) : null;
        return result;
    }
    
    async getAgentIndexByNameHash(provider: ContractProvider, nameHash: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(nameHash);
        const source = (await provider.get('agentIndexByNameHash', builder.build())).stack;
        const result = source.readBigNumberOpt();
        return result;
    }
    
    async getAgentReputation(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('agentReputation', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getAgentCount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('agentCount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getContractBalance(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('contractBalance', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getAgentsByCapability(provider: ContractProvider, capHash: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(capHash);
        const source = (await provider.get('agentsByCapability', builder.build())).stack;
        const result = source.readCellOpt();
        return result;
    }
    
    async getDisputeCount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('disputeCount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getDisputeData(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('disputeData', builder.build())).stack;
        const result_p = source.readTupleOpt();
        const result = result_p ? loadTupleDisputeInfo(result_p) : null;
        return result;
    }
    
    async getAgentCleanupInfo(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('agentCleanupInfo', builder.build())).stack;
        const result = loadGetterTupleAgentCleanupInfo(source);
        return result;
    }
    
    async getIntentsByServiceHash(provider: ContractProvider, serviceHash: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(serviceHash);
        const source = (await provider.get('intentsByServiceHash', builder.build())).stack;
        const result = source.readCellOpt();
        return result;
    }
    
    async getIntentCount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('intentCount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getOfferCount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('offerCount', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getAgentIntentQuota(provider: ContractProvider, agent: Address) {
        const builder = new TupleBuilder();
        builder.writeAddress(agent);
        const source = (await provider.get('agentIntentQuota', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getIntentData(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('intentData', builder.build())).stack;
        const result = loadGetterTupleIntentData(source);
        return result;
    }
    
    async getOfferData(provider: ContractProvider, index: bigint) {
        const builder = new TupleBuilder();
        builder.writeNumber(index);
        const source = (await provider.get('offerData', builder.build())).stack;
        const result = loadGetterTupleOfferData(source);
        return result;
    }
    
    async getStorageInfo(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('storageInfo', builder.build())).stack;
        const result = loadGetterTupleStorageInfo(source);
        return result;
    }
    
    async getStorageFundBalance(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('storageFundBalance', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getAccumulatedFeesBalance(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('accumulatedFeesBalance', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
}