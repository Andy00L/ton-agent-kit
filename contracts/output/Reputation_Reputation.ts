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
    dealIndex: bigint;
}

export function storeRate(src: Rate) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1335410632, 32);
        b_0.storeStringRefTail(src.agentName);
        b_0.storeBit(src.success);
        b_0.storeUint(src.dealIndex, 32);
    };
}

export function loadRate(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1335410632) { throw Error('Invalid prefix'); }
    const _agentName = sc_0.loadStringRefTail();
    const _success = sc_0.loadBit();
    const _dealIndex = sc_0.loadUintBig(32);
    return { $$type: 'Rate' as const, agentName: _agentName, success: _success, dealIndex: _dealIndex };
}

export function loadTupleRate(source: TupleReader) {
    const _agentName = source.readString();
    const _success = source.readBoolean();
    const _dealIndex = source.readBigNumber();
    return { $$type: 'Rate' as const, agentName: _agentName, success: _success, dealIndex: _dealIndex };
}

export function loadGetterTupleRate(source: TupleReader) {
    const _agentName = source.readString();
    const _success = source.readBoolean();
    const _dealIndex = source.readBigNumber();
    return { $$type: 'Rate' as const, agentName: _agentName, success: _success, dealIndex: _dealIndex };
}

export function storeTupleRate(source: Rate) {
    const builder = new TupleBuilder();
    builder.writeString(source.agentName);
    builder.writeBoolean(source.success);
    builder.writeNumber(source.dealIndex);
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

export type RegisterEscrow = {
    $$type: 'RegisterEscrow';
    escrowAddress: Address;
}

export function storeRegisterEscrow(src: RegisterEscrow) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(237020056, 32);
        b_0.storeAddress(src.escrowAddress);
    };
}

export function loadRegisterEscrow(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 237020056) { throw Error('Invalid prefix'); }
    const _escrowAddress = sc_0.loadAddress();
    return { $$type: 'RegisterEscrow' as const, escrowAddress: _escrowAddress };
}

export function loadTupleRegisterEscrow(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    return { $$type: 'RegisterEscrow' as const, escrowAddress: _escrowAddress };
}

export function loadGetterTupleRegisterEscrow(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    return { $$type: 'RegisterEscrow' as const, escrowAddress: _escrowAddress };
}

export function storeTupleRegisterEscrow(source: RegisterEscrow) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.escrowAddress);
    return builder.build();
}

export function dictValueParserRegisterEscrow(): DictionaryValue<RegisterEscrow> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRegisterEscrow(src)).endCell());
        },
        parse: (src) => {
            return loadRegisterEscrow(src.loadRef().beginParse());
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
    serviceName: string;
    budget: bigint;
    deadline: bigint;
    description: string;
}

export function storeBroadcastIntent(src: BroadcastIntent) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1767312928, 32);
        b_0.storeUint(src.serviceHash, 256);
        b_0.storeStringRefTail(src.serviceName);
        b_0.storeCoins(src.budget);
        b_0.storeUint(src.deadline, 32);
        b_0.storeStringRefTail(src.description);
    };
}

export function loadBroadcastIntent(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1767312928) { throw Error('Invalid prefix'); }
    const _serviceHash = sc_0.loadUintBig(256);
    const _serviceName = sc_0.loadStringRefTail();
    const _budget = sc_0.loadCoins();
    const _deadline = sc_0.loadUintBig(32);
    const _description = sc_0.loadStringRefTail();
    return { $$type: 'BroadcastIntent' as const, serviceHash: _serviceHash, serviceName: _serviceName, budget: _budget, deadline: _deadline, description: _description };
}

export function loadTupleBroadcastIntent(source: TupleReader) {
    const _serviceHash = source.readBigNumber();
    const _serviceName = source.readString();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _description = source.readString();
    return { $$type: 'BroadcastIntent' as const, serviceHash: _serviceHash, serviceName: _serviceName, budget: _budget, deadline: _deadline, description: _description };
}

export function loadGetterTupleBroadcastIntent(source: TupleReader) {
    const _serviceHash = source.readBigNumber();
    const _serviceName = source.readString();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _description = source.readString();
    return { $$type: 'BroadcastIntent' as const, serviceHash: _serviceHash, serviceName: _serviceName, budget: _budget, deadline: _deadline, description: _description };
}

export function storeTupleBroadcastIntent(source: BroadcastIntent) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.serviceHash);
    builder.writeString(source.serviceName);
    builder.writeNumber(source.budget);
    builder.writeNumber(source.deadline);
    builder.writeString(source.description);
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
    endpoint: string;
}

export function storeSendOffer(src: SendOffer) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2507343683, 32);
        b_0.storeUint(src.intentIndex, 32);
        b_0.storeCoins(src.price);
        b_0.storeUint(src.deliveryTime, 32);
        b_0.storeStringRefTail(src.endpoint);
    };
}

export function loadSendOffer(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2507343683) { throw Error('Invalid prefix'); }
    const _intentIndex = sc_0.loadUintBig(32);
    const _price = sc_0.loadCoins();
    const _deliveryTime = sc_0.loadUintBig(32);
    const _endpoint = sc_0.loadStringRefTail();
    return { $$type: 'SendOffer' as const, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, endpoint: _endpoint };
}

export function loadTupleSendOffer(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    const _endpoint = source.readString();
    return { $$type: 'SendOffer' as const, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, endpoint: _endpoint };
}

export function loadGetterTupleSendOffer(source: TupleReader) {
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    const _endpoint = source.readString();
    return { $$type: 'SendOffer' as const, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, endpoint: _endpoint };
}

export function storeTupleSendOffer(source: SendOffer) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.intentIndex);
    builder.writeNumber(source.price);
    builder.writeNumber(source.deliveryTime);
    builder.writeString(source.endpoint);
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
    serviceName: string;
    budget: bigint;
    deadline: bigint;
    status: bigint;
    acceptedOffer: bigint;
    isExpired: boolean;
    description: string;
}

export function storeIntentData(src: IntentData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.buyer);
        b_0.storeUint(src.serviceHash, 256);
        b_0.storeStringRefTail(src.serviceName);
        b_0.storeCoins(src.budget);
        b_0.storeUint(src.deadline, 32);
        b_0.storeUint(src.status, 8);
        b_0.storeUint(src.acceptedOffer, 32);
        b_0.storeBit(src.isExpired);
        b_0.storeStringRefTail(src.description);
    };
}

export function loadIntentData(slice: Slice) {
    const sc_0 = slice;
    const _buyer = sc_0.loadAddress();
    const _serviceHash = sc_0.loadUintBig(256);
    const _serviceName = sc_0.loadStringRefTail();
    const _budget = sc_0.loadCoins();
    const _deadline = sc_0.loadUintBig(32);
    const _status = sc_0.loadUintBig(8);
    const _acceptedOffer = sc_0.loadUintBig(32);
    const _isExpired = sc_0.loadBit();
    const _description = sc_0.loadStringRefTail();
    return { $$type: 'IntentData' as const, buyer: _buyer, serviceHash: _serviceHash, serviceName: _serviceName, budget: _budget, deadline: _deadline, status: _status, acceptedOffer: _acceptedOffer, isExpired: _isExpired, description: _description };
}

export function loadTupleIntentData(source: TupleReader) {
    const _buyer = source.readAddress();
    const _serviceHash = source.readBigNumber();
    const _serviceName = source.readString();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _status = source.readBigNumber();
    const _acceptedOffer = source.readBigNumber();
    const _isExpired = source.readBoolean();
    const _description = source.readString();
    return { $$type: 'IntentData' as const, buyer: _buyer, serviceHash: _serviceHash, serviceName: _serviceName, budget: _budget, deadline: _deadline, status: _status, acceptedOffer: _acceptedOffer, isExpired: _isExpired, description: _description };
}

export function loadGetterTupleIntentData(source: TupleReader) {
    const _buyer = source.readAddress();
    const _serviceHash = source.readBigNumber();
    const _serviceName = source.readString();
    const _budget = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _status = source.readBigNumber();
    const _acceptedOffer = source.readBigNumber();
    const _isExpired = source.readBoolean();
    const _description = source.readString();
    return { $$type: 'IntentData' as const, buyer: _buyer, serviceHash: _serviceHash, serviceName: _serviceName, budget: _budget, deadline: _deadline, status: _status, acceptedOffer: _acceptedOffer, isExpired: _isExpired, description: _description };
}

export function storeTupleIntentData(source: IntentData) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.buyer);
    builder.writeNumber(source.serviceHash);
    builder.writeString(source.serviceName);
    builder.writeNumber(source.budget);
    builder.writeNumber(source.deadline);
    builder.writeNumber(source.status);
    builder.writeNumber(source.acceptedOffer);
    builder.writeBoolean(source.isExpired);
    builder.writeString(source.description);
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
    endpoint: string;
}

export function storeOfferData(src: OfferData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.seller);
        b_0.storeUint(src.intentIndex, 32);
        b_0.storeCoins(src.price);
        b_0.storeUint(src.deliveryTime, 32);
        b_0.storeUint(src.status, 8);
        b_0.storeStringRefTail(src.endpoint);
    };
}

export function loadOfferData(slice: Slice) {
    const sc_0 = slice;
    const _seller = sc_0.loadAddress();
    const _intentIndex = sc_0.loadUintBig(32);
    const _price = sc_0.loadCoins();
    const _deliveryTime = sc_0.loadUintBig(32);
    const _status = sc_0.loadUintBig(8);
    const _endpoint = sc_0.loadStringRefTail();
    return { $$type: 'OfferData' as const, seller: _seller, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, status: _status, endpoint: _endpoint };
}

export function loadTupleOfferData(source: TupleReader) {
    const _seller = source.readAddress();
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    const _status = source.readBigNumber();
    const _endpoint = source.readString();
    return { $$type: 'OfferData' as const, seller: _seller, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, status: _status, endpoint: _endpoint };
}

export function loadGetterTupleOfferData(source: TupleReader) {
    const _seller = source.readAddress();
    const _intentIndex = source.readBigNumber();
    const _price = source.readBigNumber();
    const _deliveryTime = source.readBigNumber();
    const _status = source.readBigNumber();
    const _endpoint = source.readString();
    return { $$type: 'OfferData' as const, seller: _seller, intentIndex: _intentIndex, price: _price, deliveryTime: _deliveryTime, status: _status, endpoint: _endpoint };
}

export function storeTupleOfferData(source: OfferData) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.seller);
    builder.writeNumber(source.intentIndex);
    builder.writeNumber(source.price);
    builder.writeNumber(source.deliveryTime);
    builder.writeNumber(source.status);
    builder.writeString(source.endpoint);
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
    intentServiceNames: Dictionary<number, Cell>;
    intentBudgets: Dictionary<number, bigint>;
    intentDeadlines: Dictionary<number, number>;
    intentStatuses: Dictionary<number, number>;
    intentAcceptedOffer: Dictionary<number, number>;
    intentCount: bigint;
    intentsByService: Dictionary<bigint, Cell>;
    intentDescriptions: Dictionary<number, Cell>;
    offers: Dictionary<number, Address>;
    offerIntents: Dictionary<number, number>;
    offerPrices: Dictionary<number, bigint>;
    offerDeliveryTimes: Dictionary<number, number>;
    offerStatuses: Dictionary<number, number>;
    offerEndpoints: Dictionary<number, Cell>;
    offerCount: bigint;
    intentCleanupCursor: bigint;
    agentActiveIntents: Dictionary<Address, bigint>;
    maxIntentsPerAgent: bigint;
    agentNameHashes: Dictionary<number, bigint>;
    knownEscrows: Dictionary<Address, boolean>;
    dealBuyers: Dictionary<number, Address>;
    dealSellers: Dictionary<number, Address>;
    dealBuyerRated: Dictionary<number, boolean>;
    dealSellerRated: Dictionary<number, boolean>;
    dealCount: bigint;
    intentOffers: Dictionary<number, Cell>;
    agentCapIndexed: Dictionary<bigint, boolean>;
    agentIndexedCaps: Dictionary<number, Cell>;
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
        b_5.storeDict(src.intentServiceNames, Dictionary.Keys.Uint(32), Dictionary.Values.Cell());
        const b_6 = new Builder();
        b_6.storeDict(src.intentBudgets, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257));
        b_6.storeDict(src.intentDeadlines, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_6.storeDict(src.intentStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8));
        const b_7 = new Builder();
        b_7.storeDict(src.intentAcceptedOffer, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_7.storeUint(src.intentCount, 32);
        b_7.storeDict(src.intentsByService, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell());
        b_7.storeDict(src.intentDescriptions, Dictionary.Keys.Uint(32), Dictionary.Values.Cell());
        const b_8 = new Builder();
        b_8.storeDict(src.offers, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_8.storeDict(src.offerIntents, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_8.storeDict(src.offerPrices, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257));
        const b_9 = new Builder();
        b_9.storeDict(src.offerDeliveryTimes, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32));
        b_9.storeDict(src.offerStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8));
        b_9.storeDict(src.offerEndpoints, Dictionary.Keys.Uint(32), Dictionary.Values.Cell());
        b_9.storeUint(src.offerCount, 32);
        b_9.storeUint(src.intentCleanupCursor, 32);
        const b_10 = new Builder();
        b_10.storeDict(src.agentActiveIntents, Dictionary.Keys.Address(), Dictionary.Values.BigInt(257));
        b_10.storeUint(src.maxIntentsPerAgent, 8);
        b_10.storeDict(src.agentNameHashes, Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256));
        b_10.storeDict(src.knownEscrows, Dictionary.Keys.Address(), Dictionary.Values.Bool());
        const b_11 = new Builder();
        b_11.storeDict(src.dealBuyers, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_11.storeDict(src.dealSellers, Dictionary.Keys.Uint(32), Dictionary.Values.Address());
        b_11.storeDict(src.dealBuyerRated, Dictionary.Keys.Uint(32), Dictionary.Values.Bool());
        const b_12 = new Builder();
        b_12.storeDict(src.dealSellerRated, Dictionary.Keys.Uint(32), Dictionary.Values.Bool());
        b_12.storeUint(src.dealCount, 32);
        b_12.storeDict(src.intentOffers, Dictionary.Keys.Uint(32), Dictionary.Values.Cell());
        b_12.storeDict(src.agentCapIndexed, Dictionary.Keys.BigUint(256), Dictionary.Values.Bool());
        b_12.storeDict(src.agentIndexedCaps, Dictionary.Keys.Uint(32), Dictionary.Values.Cell());
        b_12.storeCoins(src.storageFund);
        b_12.storeCoins(src.accumulatedFees);
        b_11.storeRef(b_12.endCell());
        b_10.storeRef(b_11.endCell());
        b_9.storeRef(b_10.endCell());
        b_8.storeRef(b_9.endCell());
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
    const _intentServiceNames = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), sc_5);
    const sc_6 = sc_5.loadRef().beginParse();
    const _intentBudgets = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), sc_6);
    const _intentDeadlines = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_6);
    const _intentStatuses = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), sc_6);
    const sc_7 = sc_6.loadRef().beginParse();
    const _intentAcceptedOffer = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_7);
    const _intentCount = sc_7.loadUintBig(32);
    const _intentsByService = Dictionary.load(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), sc_7);
    const _intentDescriptions = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), sc_7);
    const sc_8 = sc_7.loadRef().beginParse();
    const _offers = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_8);
    const _offerIntents = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_8);
    const _offerPrices = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), sc_8);
    const sc_9 = sc_8.loadRef().beginParse();
    const _offerDeliveryTimes = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), sc_9);
    const _offerStatuses = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), sc_9);
    const _offerEndpoints = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), sc_9);
    const _offerCount = sc_9.loadUintBig(32);
    const _intentCleanupCursor = sc_9.loadUintBig(32);
    const sc_10 = sc_9.loadRef().beginParse();
    const _agentActiveIntents = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), sc_10);
    const _maxIntentsPerAgent = sc_10.loadUintBig(8);
    const _agentNameHashes = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256), sc_10);
    const _knownEscrows = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.Bool(), sc_10);
    const sc_11 = sc_10.loadRef().beginParse();
    const _dealBuyers = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_11);
    const _dealSellers = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), sc_11);
    const _dealBuyerRated = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), sc_11);
    const sc_12 = sc_11.loadRef().beginParse();
    const _dealSellerRated = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), sc_12);
    const _dealCount = sc_12.loadUintBig(32);
    const _intentOffers = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), sc_12);
    const _agentCapIndexed = Dictionary.load(Dictionary.Keys.BigUint(256), Dictionary.Values.Bool(), sc_12);
    const _agentIndexedCaps = Dictionary.load(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), sc_12);
    const _storageFund = sc_12.loadCoins();
    const _accumulatedFees = sc_12.loadCoins();
    return { $$type: 'Reputation$Data' as const, owner: _owner, fee: _fee, agentCount: _agentCount, agentOwners: _agentOwners, agentAvailable: _agentAvailable, agentTotalTasks: _agentTotalTasks, agentSuccesses: _agentSuccesses, agentRegisteredAt: _agentRegisteredAt, agentLastActive: _agentLastActive, nameToIndex: _nameToIndex, capabilityIndex: _capabilityIndex, openDisputes: _openDisputes, disputeDepositors: _disputeDepositors, disputeBeneficiaries: _disputeBeneficiaries, disputeAmounts: _disputeAmounts, disputeDeadlines: _disputeDeadlines, disputeSettled: _disputeSettled, disputeCount: _disputeCount, cleanupCursor: _cleanupCursor, intents: _intents, intentServiceHashes: _intentServiceHashes, intentServiceNames: _intentServiceNames, intentBudgets: _intentBudgets, intentDeadlines: _intentDeadlines, intentStatuses: _intentStatuses, intentAcceptedOffer: _intentAcceptedOffer, intentCount: _intentCount, intentsByService: _intentsByService, intentDescriptions: _intentDescriptions, offers: _offers, offerIntents: _offerIntents, offerPrices: _offerPrices, offerDeliveryTimes: _offerDeliveryTimes, offerStatuses: _offerStatuses, offerEndpoints: _offerEndpoints, offerCount: _offerCount, intentCleanupCursor: _intentCleanupCursor, agentActiveIntents: _agentActiveIntents, maxIntentsPerAgent: _maxIntentsPerAgent, agentNameHashes: _agentNameHashes, knownEscrows: _knownEscrows, dealBuyers: _dealBuyers, dealSellers: _dealSellers, dealBuyerRated: _dealBuyerRated, dealSellerRated: _dealSellerRated, dealCount: _dealCount, intentOffers: _intentOffers, agentCapIndexed: _agentCapIndexed, agentIndexedCaps: _agentIndexedCaps, storageFund: _storageFund, accumulatedFees: _accumulatedFees };
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
    const _intentServiceNames = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), source.readCellOpt());
    const _intentBudgets = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _intentDeadlines = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _intentAcceptedOffer = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentCount = source.readBigNumber();
    const _intentsByService = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), source.readCellOpt());
    source = source.readTuple();
    const _intentDescriptions = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), source.readCellOpt());
    const _offers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _offerIntents = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerPrices = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _offerDeliveryTimes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _offerEndpoints = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), source.readCellOpt());
    const _offerCount = source.readBigNumber();
    const _intentCleanupCursor = source.readBigNumber();
    const _agentActiveIntents = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _maxIntentsPerAgent = source.readBigNumber();
    const _agentNameHashes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256), source.readCellOpt());
    const _knownEscrows = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.Bool(), source.readCellOpt());
    const _dealBuyers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    source = source.readTuple();
    const _dealSellers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _dealBuyerRated = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _dealSellerRated = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _dealCount = source.readBigNumber();
    const _intentOffers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), source.readCellOpt());
    const _agentCapIndexed = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Bool(), source.readCellOpt());
    const _agentIndexedCaps = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), source.readCellOpt());
    const _storageFund = source.readBigNumber();
    const _accumulatedFees = source.readBigNumber();
    return { $$type: 'Reputation$Data' as const, owner: _owner, fee: _fee, agentCount: _agentCount, agentOwners: _agentOwners, agentAvailable: _agentAvailable, agentTotalTasks: _agentTotalTasks, agentSuccesses: _agentSuccesses, agentRegisteredAt: _agentRegisteredAt, agentLastActive: _agentLastActive, nameToIndex: _nameToIndex, capabilityIndex: _capabilityIndex, openDisputes: _openDisputes, disputeDepositors: _disputeDepositors, disputeBeneficiaries: _disputeBeneficiaries, disputeAmounts: _disputeAmounts, disputeDeadlines: _disputeDeadlines, disputeSettled: _disputeSettled, disputeCount: _disputeCount, cleanupCursor: _cleanupCursor, intents: _intents, intentServiceHashes: _intentServiceHashes, intentServiceNames: _intentServiceNames, intentBudgets: _intentBudgets, intentDeadlines: _intentDeadlines, intentStatuses: _intentStatuses, intentAcceptedOffer: _intentAcceptedOffer, intentCount: _intentCount, intentsByService: _intentsByService, intentDescriptions: _intentDescriptions, offers: _offers, offerIntents: _offerIntents, offerPrices: _offerPrices, offerDeliveryTimes: _offerDeliveryTimes, offerStatuses: _offerStatuses, offerEndpoints: _offerEndpoints, offerCount: _offerCount, intentCleanupCursor: _intentCleanupCursor, agentActiveIntents: _agentActiveIntents, maxIntentsPerAgent: _maxIntentsPerAgent, agentNameHashes: _agentNameHashes, knownEscrows: _knownEscrows, dealBuyers: _dealBuyers, dealSellers: _dealSellers, dealBuyerRated: _dealBuyerRated, dealSellerRated: _dealSellerRated, dealCount: _dealCount, intentOffers: _intentOffers, agentCapIndexed: _agentCapIndexed, agentIndexedCaps: _agentIndexedCaps, storageFund: _storageFund, accumulatedFees: _accumulatedFees };
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
    const _intentServiceNames = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), source.readCellOpt());
    const _intentBudgets = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _intentDeadlines = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _intentAcceptedOffer = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _intentCount = source.readBigNumber();
    const _intentsByService = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell(), source.readCellOpt());
    const _intentDescriptions = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), source.readCellOpt());
    const _offers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _offerIntents = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerPrices = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _offerDeliveryTimes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32), source.readCellOpt());
    const _offerStatuses = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8), source.readCellOpt());
    const _offerEndpoints = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), source.readCellOpt());
    const _offerCount = source.readBigNumber();
    const _intentCleanupCursor = source.readBigNumber();
    const _agentActiveIntents = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _maxIntentsPerAgent = source.readBigNumber();
    const _agentNameHashes = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256), source.readCellOpt());
    const _knownEscrows = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.Bool(), source.readCellOpt());
    const _dealBuyers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _dealSellers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Address(), source.readCellOpt());
    const _dealBuyerRated = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _dealSellerRated = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Bool(), source.readCellOpt());
    const _dealCount = source.readBigNumber();
    const _intentOffers = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), source.readCellOpt());
    const _agentCapIndexed = Dictionary.loadDirect(Dictionary.Keys.BigUint(256), Dictionary.Values.Bool(), source.readCellOpt());
    const _agentIndexedCaps = Dictionary.loadDirect(Dictionary.Keys.Uint(32), Dictionary.Values.Cell(), source.readCellOpt());
    const _storageFund = source.readBigNumber();
    const _accumulatedFees = source.readBigNumber();
    return { $$type: 'Reputation$Data' as const, owner: _owner, fee: _fee, agentCount: _agentCount, agentOwners: _agentOwners, agentAvailable: _agentAvailable, agentTotalTasks: _agentTotalTasks, agentSuccesses: _agentSuccesses, agentRegisteredAt: _agentRegisteredAt, agentLastActive: _agentLastActive, nameToIndex: _nameToIndex, capabilityIndex: _capabilityIndex, openDisputes: _openDisputes, disputeDepositors: _disputeDepositors, disputeBeneficiaries: _disputeBeneficiaries, disputeAmounts: _disputeAmounts, disputeDeadlines: _disputeDeadlines, disputeSettled: _disputeSettled, disputeCount: _disputeCount, cleanupCursor: _cleanupCursor, intents: _intents, intentServiceHashes: _intentServiceHashes, intentServiceNames: _intentServiceNames, intentBudgets: _intentBudgets, intentDeadlines: _intentDeadlines, intentStatuses: _intentStatuses, intentAcceptedOffer: _intentAcceptedOffer, intentCount: _intentCount, intentsByService: _intentsByService, intentDescriptions: _intentDescriptions, offers: _offers, offerIntents: _offerIntents, offerPrices: _offerPrices, offerDeliveryTimes: _offerDeliveryTimes, offerStatuses: _offerStatuses, offerEndpoints: _offerEndpoints, offerCount: _offerCount, intentCleanupCursor: _intentCleanupCursor, agentActiveIntents: _agentActiveIntents, maxIntentsPerAgent: _maxIntentsPerAgent, agentNameHashes: _agentNameHashes, knownEscrows: _knownEscrows, dealBuyers: _dealBuyers, dealSellers: _dealSellers, dealBuyerRated: _dealBuyerRated, dealSellerRated: _dealSellerRated, dealCount: _dealCount, intentOffers: _intentOffers, agentCapIndexed: _agentCapIndexed, agentIndexedCaps: _agentIndexedCaps, storageFund: _storageFund, accumulatedFees: _accumulatedFees };
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
    builder.writeCell(source.intentServiceNames.size > 0 ? beginCell().storeDictDirect(source.intentServiceNames, Dictionary.Keys.Uint(32), Dictionary.Values.Cell()).endCell() : null);
    builder.writeCell(source.intentBudgets.size > 0 ? beginCell().storeDictDirect(source.intentBudgets, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.intentDeadlines.size > 0 ? beginCell().storeDictDirect(source.intentDeadlines, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.intentStatuses.size > 0 ? beginCell().storeDictDirect(source.intentStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8)).endCell() : null);
    builder.writeCell(source.intentAcceptedOffer.size > 0 ? beginCell().storeDictDirect(source.intentAcceptedOffer, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeNumber(source.intentCount);
    builder.writeCell(source.intentsByService.size > 0 ? beginCell().storeDictDirect(source.intentsByService, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell()).endCell() : null);
    builder.writeCell(source.intentDescriptions.size > 0 ? beginCell().storeDictDirect(source.intentDescriptions, Dictionary.Keys.Uint(32), Dictionary.Values.Cell()).endCell() : null);
    builder.writeCell(source.offers.size > 0 ? beginCell().storeDictDirect(source.offers, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.offerIntents.size > 0 ? beginCell().storeDictDirect(source.offerIntents, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.offerPrices.size > 0 ? beginCell().storeDictDirect(source.offerPrices, Dictionary.Keys.Uint(32), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.offerDeliveryTimes.size > 0 ? beginCell().storeDictDirect(source.offerDeliveryTimes, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(32)).endCell() : null);
    builder.writeCell(source.offerStatuses.size > 0 ? beginCell().storeDictDirect(source.offerStatuses, Dictionary.Keys.Uint(32), Dictionary.Values.Uint(8)).endCell() : null);
    builder.writeCell(source.offerEndpoints.size > 0 ? beginCell().storeDictDirect(source.offerEndpoints, Dictionary.Keys.Uint(32), Dictionary.Values.Cell()).endCell() : null);
    builder.writeNumber(source.offerCount);
    builder.writeNumber(source.intentCleanupCursor);
    builder.writeCell(source.agentActiveIntents.size > 0 ? beginCell().storeDictDirect(source.agentActiveIntents, Dictionary.Keys.Address(), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeNumber(source.maxIntentsPerAgent);
    builder.writeCell(source.agentNameHashes.size > 0 ? beginCell().storeDictDirect(source.agentNameHashes, Dictionary.Keys.Uint(32), Dictionary.Values.BigUint(256)).endCell() : null);
    builder.writeCell(source.knownEscrows.size > 0 ? beginCell().storeDictDirect(source.knownEscrows, Dictionary.Keys.Address(), Dictionary.Values.Bool()).endCell() : null);
    builder.writeCell(source.dealBuyers.size > 0 ? beginCell().storeDictDirect(source.dealBuyers, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.dealSellers.size > 0 ? beginCell().storeDictDirect(source.dealSellers, Dictionary.Keys.Uint(32), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.dealBuyerRated.size > 0 ? beginCell().storeDictDirect(source.dealBuyerRated, Dictionary.Keys.Uint(32), Dictionary.Values.Bool()).endCell() : null);
    builder.writeCell(source.dealSellerRated.size > 0 ? beginCell().storeDictDirect(source.dealSellerRated, Dictionary.Keys.Uint(32), Dictionary.Values.Bool()).endCell() : null);
    builder.writeNumber(source.dealCount);
    builder.writeCell(source.intentOffers.size > 0 ? beginCell().storeDictDirect(source.intentOffers, Dictionary.Keys.Uint(32), Dictionary.Values.Cell()).endCell() : null);
    builder.writeCell(source.agentCapIndexed.size > 0 ? beginCell().storeDictDirect(source.agentCapIndexed, Dictionary.Keys.BigUint(256), Dictionary.Values.Bool()).endCell() : null);
    builder.writeCell(source.agentIndexedCaps.size > 0 ? beginCell().storeDictDirect(source.agentIndexedCaps, Dictionary.Keys.Uint(32), Dictionary.Values.Cell()).endCell() : null);
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
    const __code = Cell.fromHex('b5ee9c724102db01004bf700022cff008e88f4a413f4bcf2c80bed53208e8130e1ed43d9014e0202710225020120030b020120040902027605070345a71bda89a1a400031d0ff4800203a3b679c61bb678ae20be1eae20be1eae20be1ed8634f5106000456210345a715da89a1a400031d0ff4800203a3b679c61bb678ae20be1eae20be1eae20be1ed8634f51080002200347b7a7bda89a1a400031d0ff4800203a3b679c61bb678ae20be1eae20be1eae20be1ed86304f510a000456300201200c0f03f3b7431da89a1a400031d0ff4800203a3b679c61a226422662264226222642262226022622260225e2260225e225c225e225c225a225c225a2258225a2258225622582256225422562254225222542252225022522250224e2250224e224c224e224c224a224c224a2248224a224822462248224622442246224504f510d02fc112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f57100e4b002c8307562b0280204133f40e6fa19401d70130925b6de20201201023020120111403f3ad98f6a268690000c743fd200080e8ed9e7186889908998899089888990898889808988898089788980897889708978897089688970896889608968896089588960895889508958895089488950894889408948894089388940893889308938893089288930892889208928892089188920891889108918891404f511202fc112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f5710134b001c8307562a0259f40f6fa192306ddf020148151d020120161b03f1a033b513434800063a1fe9000407476cf38c3444c844cc44c844c444c844c444c044c444c044bc44c044bc44b844bc44b844b444b844b444b044b444b044ac44b044ac44a844ac44a844a444a844a444a044a444a0449c44a0449c4498449c4498449444984494449044944490448c4490448c4488448c448a4f511702fc112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f5710181a01de20c100917f94205632bee292306de0563080202259f40e6fa192306ddf206e925b6de080202056315422434133f40e6fa19401d70130925b6de280202056315422534133f40e6fa19401d70130925b6de280202056315422634133f40e6fa19401d70130925b6de2802056344016711900a64133f40e6fa19401d70030925b6de203206ef2d080236eb39603206ef2d080923370e2226eb39602206ef2d080923270e2216eb39601206ef2d080923170e2246eb39604206ef2d080923470e2103441306f0500345f0f6c31206e92306d99206ef2d0806f256f05e2206e92306dde0339a3abb513434800063a1fe9000407476cf38c376cf1b311b311b311b3d24f511c00385630a7035619a703a0208100f0a87021c20095305330a904de24552003f1a701da89a1a400031d0ff4800203a3b679c61a226422662264226222642262226022622260225e2260225e225c225e225c225a225c225a2258225a2258225622582256225422562254225222542252225022522250224e2250224e224c224e224c224a224c224a2248224a22482246224822462244224622454f511e02fc112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550edb3c6c996c996c996c996c991f2201e6562080202259f40e6fa192306ddf206ef2d080561c802023784133f40e6fa19401d70130925b6de2206ef2d08080202056205422534133f40e6fa19401d70130925b6de2206ef2d0807080202056205422734133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e256228020262001fc59f40f6fa192306ddf8b08216eb39730206ef2d080d09131e2561c80202759f40f6fa192306ddf8b08216eb39730206ef2d080d09131e2562580202883074133f40e6fa19401d70130925b6de2206ef2d0808020562540198101014133f40e6fa19401d70030925b6de2206ef2d08025c00094f82325be9170e2107810362100085005441400046c690347b1aafb513434800063a1fe9000407476cf38c376cf15c417c3d5c417c3d5c417c3db0c604f5124000221020120264102012027380201202835020120292b0347acaf76a268690000c743fd200080e8ed9e7186ed9e2b882f87ab882f87ab882f87b618c04f512a000456180201482c3103f1a785da89a1a400031d0ff4800203a3b679c61a226422662264226222642262226022622260225e2260225e225c225e225c225a225c225a2258225a2258225622582256225422562254225222542252225022522250224e2250224e224c224e224c224a224c224a2248224a22482246224822462244224622454f512d01fc112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550edb3c6caa6caa6caa6caa6cba2e01f6563080202259f40e6fa192306ddf6e99707054700053007021e07080202056315422434133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27080202056315422534133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27022c2009630a76421a9049131e27080202056315422632f01f84133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27080202056315422734133f40e6fa19401d70130925b6de2206eb39631206ef2d0809130e27021c2009b30f82321a182015180a904de7023c2009b30f82323a182015180a904de7026c2639325c1149170e2923071de20c0009323c2009170e23000809af82324a18208278d00bc9170e2923072de20c0009326c0009170e29324c2009170e29af82325a18208093a80bc9170e2923073de7f21c2001850060504431303f1a41bda89a1a400031d0ff4800203a3b679c61a226422662264226222642262226022622260225e2260225e225c225e225c225a225c225a2258225a2258225622582256225422562254225222542252225022522250224e2250224e224c224e224c224a224c224a2248224a22482246224822462244224622454f513201f8112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550edb3c6cc66cc66cc66cf63301e2561180202259f40f6fa192306ddf8b08216eb39730206ef2d080d09131e2561780202359f40e6fa192306ddf206ef2d08080202056195422534133f40e6fa19401d70130925b6de2206ef2d08056178020258101014133f40e6fa19401d70030925b6de2206ef2d08080202056195422733400684133f40e6fa19401d70130925b6de2206ef2d080802056184017784133f40e6fa19401d70130925b6de2206ef2d080103544030203f3b30dbb513434800063a1fe9000407476cf38c3444c844cc44c844c444c844c444c044c444c044bc44c044bc44b844bc44b844b444b844b444b044b444b044ac44b044ac44a844ac44a844a444a844a444a044a444a0449c44a0449c4498449c4498449444984494449044944490448c4490448c4488448c448a04f513602fc112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f5710374b001c830756190259f40f6fa192306ddf020120393e0201583a3c0346a904ed44d0d200018e87fa400101d1db3ce30ddb3c57105f0f57105f0f57105f0f6c314f513b0002250346aa8ded44d0d200018e87fa400101d1db3ce30ddb3c57105f0f57105f0f57105f0f6c314f513d0008f8276f1003f3b0357b513434800063a1fe9000407476cf38c3444c844cc44c844c444c844c444c044c444c044bc44c044bc44b844bc44b844b444b844b444b044b444b044ac44b044ac44a844ac44a844a444a844a444a044a444a0449c44a0449c4498449c4498449444984494449044944490448c4490448c4488448c448a04f513f02fc112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f5710404b00c820c100917f94205632bee2923070e080202056305422334133f40e6fa19401d70130925b6de2206e917f9820206ef2d080c000e2925b70e080202056300350444133f40e6fa19401d70130925b6de2206e925b70e0206ef2d080a76401206ef2d080a904020120424c02016a434803f2ab3eed44d0d200018e87fa400101d1db3ce30d113211331132113111321131113011311130112f1130112f112e112f112e112d112e112d112c112d112c112b112c112b112a112b112a1129112a11291128112911281127112811271126112711261125112611251124112511241123112411231122112311224f514402fc112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f5710454701f620c100917f94205623bee292306de0562880202259f40e6fa192306ddf206e925b6de05624802023714133f40e6fa19401d70030925b6de201206ef2d080562980202459f40e6fa192306ddf206ef2d080562980202559f40e6fa192306ddf206ef2d08056298020268101014133f40e6fa19401d70030925b6de246006c206ef2d080802020562b0350884133f40e6fa19401d70130925b6de2206ef2d080246eb39604206ef2d080923470e210354430126f0600345f0f6c31206e92306d99206ef2d0806f266f06e2206e92306dde03f2a9b4ed44d0d200018e87fa400101d1db3ce30d113211331132113111321131113011311130112f1130112f112e112f112e112d112e112d112c112d112c112b112c112b112a112b112a1129112a11291128112911281127112811271126112711261125112611251124112511241123112411231122112311224f514902fc112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550edb3c57105f0f57105f0f57104a4b004681010b2f028101014133f40a6fa19401d70030925b6de2206eb395206ef2d080e0307000085f0f6c310347b42a3da89a1a400031d0ff4800203a3b679c61bb678ae20be1eae20be1eae20be1ed86304f514d00022f049c01d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018e87fa400101d1db3ce30d1134985f0f5f0f5f0f5f07e01132d70d1ff2e08221821038a0a307bae3022182104f98bfc8ba4f51555d01f46d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d6d82089896807054700053007a5471110a11310a091130090a112f0a09112e090a112d0a09112c090a112b0a09112a090a11290a091128090a11270a091126090a11250a091124090a11230a09112209081121085000b8071120070a111f0a09111e0908111d0807111c070a111b0a09111a090811190806111806071117070a11160a091115090811140806111306071112070a11110a09111009105f104e108d103c106b107a10791078105710461025102402f8db3c5733113111321131113011311130112f1130112f112e112f112e112d112e112d112c112d112c112b112c112b112a112b112a1129112a1129112811291128112711281127112611271126112511261125112411251124112311241123112211231122112111221121112011211120111f1120111f111e111f111e525401f4fa40fa00d31ff404d401d0f404f404f404d430d0f404f404f404d430d0f404f404f404d430d0f404f404f404d430d0f404d31fd31ff404f404d430d0f404f404f404d430d0f404f404d31ff404d430d0f404f404f404d430d0f404f404f404d430d0f404d31fd31ff404d307f404d430d0f404f404f404d430d0530058f404f404d31ff404d430d0f404f404fa00fa0030112f1133112f112f1132112f112f1131112f112f1130112f00b4111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550e03f631d401d001d431d200308160adf8416f24135f035633bef2f4019b9320d74a91d5e868f90400da11562983072280204133f40e6fa19401d70130925b6de2206eb3e30f113011321130112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b1129112a11271129112756575a00d431206ef2d080562f80202259f40e6fa192306ddf817b16216eb39bf84202206ef2d08012c705923170e2f2f401112e0180205110113071216e955b59f45b3098c801cf004133f443e28020f8232104112c04102302113002216e955b59f45b3098c801cf014133f443e201fe3056308020f84202113202563201206e953059f45b30944133f416e201112f018020015631500471216e955b59f45b3098c801cf004133f443e28020702103113003563259216e955b59f45b3098c801cf014133f443e28020702103112f03563259216e955b59f45b3098c801cf014133f443e28020f8232103112e0356325801fa59216e955b59f45b3098c801cf014133f443e28020f8232103112d03563259216e955b59f45b3098c801cf014133f443e211298307562f56318020216e955b59f45b3098c801cf014133f443e2102b80200201113001112f8307216e955b59f45b3098c801cf014133f443e2112ea4112e112c112d112c112b112c112b59002e112a112b112a1129112a1129112811291128091128112701fc112611281126112511271125112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411125b03fc1111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443072db3c018208e4e1c0a0015631a05ca08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e298d25c01b4f400c901fb00c87f01ca001133113211311130112f112e112d112c112b112a1129112811271126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54d902fe8efc31d401d001d200d31f308160adf8416f24135f035634bef2f4029b9320d74a91d5e868f90400da118307562b0280204133f40e6fa19401d70130925b6de2816cce216eb3f2f4206ef2d08080202056305422334133f40e6fa19401d70130925b6de2206e95816ccef2f0de2b80202559f40e6fa192306ddf2b802026e05e6503fe59f40e6fa192306ddf811f38226eb393216eb39170e2f2f4563380202559f40e6fa192306ddf816cce216eb3f2f4f84223206ef2d080c7059e20206ef2d08022206ef2d080c7059170e2f84203206ef2d08013c7059e206ef2d08002206ef2d08012c70593303170e2814c1c2292317f9101e2f2f4e30f802003206ef2d0805f6061008429802025714133f40e6fa19401d70030925b6de2820084ae216e92317f9801206ef2d080c000e2f2f419802050047f71216e955b59f45b3098c801cf004133f443e2008828802025714133f40e6fa19401d70030925b6de2820084ae216e92317f9801206ef2d080c000e2f2f418802050047f71216e955b59f45b3098c801cf004133f443e2070801fea423031130032a103559216e955b59f45b3098c801cf014133f443e2112d8e3980205300562e5422a34133f40e6fa19401d70130925b6de2206ef2d080a42103112e032959216e955b59f45b3098c801cf014133f443e2112bde8020f8232104112c0410231029216e955b59f45b3098c801cf014133f443e21130113211306201f4112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b1129112a112711291127112611281126112511271125112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b6302fc111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443071db3c0182082dc6c0a0015631a05ca08208989680a070fb02f8427098640278810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00d2d8044c21821054e26a4bbae302218210148534b8bae3022182108711bf6fbae3022182100e20a398ba666a6f7201fc31d401d001d20030019b9320d74a91d5e868f90400da118307562a0280204133f40e6fa19401d70130925b6de2816cce216eb3f2f4206ef2d080562f80202259f40e6fa192306ddf820097a4216eb39bf84202206ef2d08012c705923170e2f2f401112e0180205110113071216e955b59f45b3098c801cf004133f443e26702f68020f8232104112c04102302113002216e955b59f45b3098c801cf014133f443e2113182082dc6c0a0205633a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00113011321130d26801fc112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b11291129112a1129112711291127112611281126112511271125112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b6901c4111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a107910681057104610354403d801fe31d31fd3ff30562f80202359f40e6fa192306ddf816cce216eb3f2f4811bd6f84202206ef2d08012c705f2f421aa3f21a9383fa024830722714133f40e6fa19401d70030925b6de28200a996216e92317f9801206ef2d080c000e2f2f4148307017f71216e955b59f45b3098c801cf004133f443e28020f8232103112d03246b01fc59216e955b59f45b3098c801cf014133f443e2562883072559f40f6fa192306ddfc85230cb1f216eb39c7101cb0001206ef2d08001cc947032cb00e2830701c902112a025250206e953059f45b30944133f417e22280202359f40f6fa192306ddfc815cbff246eb39d7101cb0004206ef2d0805004cc9634705004cb00e26c02fe802001c912206e953059f45b30944133f417e2113182087a1200a0205633a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00113011321130112f1131112f112e1130112e112d112f112dd26d01f8112c112e112c112b112d112b112a112c112a1129112b11291126112a112611271129112701112801112511271125112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11186e01a21117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035440302d801fe31d3073020c23293308032de20c101923071de113111331131113011321130112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b11291128112a11281127112911271126112811261125112711251124112611241123112511231122112411221121112311211120112211207001fc111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a1079106810571046103571039c4430db3c5ca08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0098d2d803fe8f7d31fa40308200b27cf8425633c705f2f41981010b017f71216e955b59f4593098c801cf004133f441e2113182082dc6c0a0205633a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00d2737501fc113011321130112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b11291128112a1128112711291127112611281126112511271125112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c7401d0111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b109a107910681057104610354403d802fee02182102f7e5059ba8ef431fa40fa40fa40fa00d31f3081010bf8422f59714133f40a6fa19401d70030925b6de2811953216eb39601206ef2d080923170e2f2f401112a0180200156255006206e953059f45b30944133f416e20111280180200156245004206e953059f45b30944133f416e2011126018020015623011129767a01fe206e953059f45b30944133f416e2011124018020015622011129810101216e955b59f45b3098c801cf004133f443e28020200311240312562202112601216e955b59f45b3098c801cf014133f443e21120802056207071216e955b59f45b3098c801cf004133f443e2111fa4113182084c4b40a0205633a08208989680a0707702fafb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00113011321130112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b11291128112a1128112711291127d27801fc112611281126112311271123112411261124112211241122112011231120111f1122111f112011211120111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311117901f41110111211100f11110f0e11100e10df10ce10bd10ac109b108a107910681057104610354403c87f01ca001133113211311130112f112e112d112c112b112a1129112811271126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54d9044ee0218210bfa05986bae3022182102365d020bae30221821069570e20bae30221821095730743ba7b7f83b301fe31fa403081010bf8422b59714133f40a6fa19401d70030925b6de2811953216eb39601206ef2d080923170e2f2f47094205622b98e3e562780202259f40e6fa192306ddf206eb398206ef2d08022c705923070e28e1c1122802056237f71216e955b59f45b3098c801cf004133f443e21122dea4e85b113182082dc6c0a0207c02f65633a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00113011321130112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b1129d27d01fc1128112a1128112711291127112611281126112511271125112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611147e01721113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035440302d803fc5b8168c9f8425632c705f2f4562ea7035617a703a08100f0a870218e1b21c2008e13563322a904c2149830a71411325632a19131e29131e2945b701132e201113301a082009ebc2182084c4b40bcf2f47072708856340405552010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf818ae280c781002400000000466565732077697468647261776e01fcf400c901fb00113011321130112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b11291128112a1128112711291127112611281126112511271125112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d8201dc111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a107910681057104610354430d802fe31d3ffd401d001fa00d31fd430d0811127f8235230bcf2f48159c223c200f2f4f82382015180a05320bc91329130e27081010bf8425613598101014133f40a6fa19401d70030925b6de2206eb39631206ef2d0809130e2205611bee3008020f84202112502561e01206e953059f45b30944133f416e211228020561d278307848c01f4f842113311371133113211361132113111351131113011341130112f1137112f112e1136112e112d1135112d112c1134112c112b1137112b112a1136112a1129113511291128113411281127113711271126113611261125113511251124113411241123113711231122113611221121113511211120113411208501f8111f1137111f111e1136111e111d1135111d111c1134111c111b1137111b111a1136111a1119113511191118113411181117113711171116113611161115113511151114113411141113113711131112113611121111113511111110113411100f11370f0e11360e0d11350d0c11340c0b11370b0a11360a091135098602f80811340807113707061136060511350504113404031137030211380201113901db3c8e2a573881010bf8422e598101014133f40a6fa19401d70030925b6de2206eb395206ef2d080923070e21138de811d3856392eb9f2f4113801113701113211361132113111351131113011341130112f1133112f112e1132112e878a012eeda2edfb70209b21c1329420561cb99170e28ae85f03708802fe562280202259f40e6fa192306ddf561e802023784133f40e6fa19401d70130925b6de2216eb39901206ef2d08024c705923170e293206eb39170e297206ef2d080c000923070e28eb280202056205422334133f40e6fa19401d70130925b6de2206eb399f82301206ef2d080be923070e28e876c21db3c7fdb31e0dea401a4a68900020101fc112d1131112d112c1130112c112b112f112b112a112e112a1129112d11291128112c11281127112b11271126112a1126112511291125112411281124112311271123112211261122112111251121112011241120111f1123111f111e1122111e111d1121111d111c1120111c111b111f111b111a111e111a1119111d11198b00b41118111c11181117111b11171116111a11161115111911151114111811141113111711131112111611121111111511111110111411100f11130f0e11120e0d11110d0c11100c10bf10ae109d108c107b106a105910481037102601f0216e955b59f45b3098c801cf014133f443e28020c85006cf16c90211220215561d01206e953059f45b30944133f417e201111f01802001561c5004810101216e955b59f45b3098c801cf004133f443e280202003111f0312561c02112101216e955b59f45b3098c801cf014133f443e2111b8020561a70788d01fc216e955b59f45b3098c801cf014133f443e28020c8011120cf16c90211180201111f01561a01206e953059f45b30944133f417e25618a481010bf8421122a4031110031201112201810101216e955b59f4593098c801cf004133f441e2111e111f111e1116111e1116111b111d111b111a111b111a1116111811160d11168e02f80111330111345633db3c113211341132113111331131113011321130112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b11291128112a11281127112911271126112811261125112711251124112611241123112511231122112411221121112311211120112211208f91013c561883072259f40f6fa192306ddf709a216eb39320c1039170e28ae85f039000e801206ef2d080d0d31f8020561f4013784133f40e6fa19401d70130925b6de2206eb397206ef2d080c300923070e28e38d200018e17d430111a830723561c206e953059f45b30944133f417e28e193011198307226d206e953059f45b30944133f417e26d111a01e294306d111ae201a401111a0104f6111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e551ddb3cdb3c71db3c018208e4e1c0a05301a0929398b20082561983072359f40f6fa192306ddfc812cb1f216eb39c7101cb0001206ef2d08001cc947032cb00e2830701c903111a0312206e953059f45b30944133f417e2111701eeeda2edfb2e709b20c1059421561bb99170e28ed5561c802023784133f40e6fa19401d70130925b6de2206eb397206ef2d080c000923070e28eaa802020561f5422434133f40e6fa19401d70130925b6de2206eb399f82301206ef2d080be923070e2e302de01a401a4e8303f2e5619be923e70910ee20e9401fe30113211331132113111331131113011331130112f1133112f112e1133112e112d1133112d112c1133112c112b1133112b112a1133112a112911331129112811331128112711331127112611331126112511331125112411331124112311331123112211331122112111331121112011331120111f1133111f111e1133111e9502fe111d1133111d111c1133111c111b1133111b111a1133111a1119113311191118113311181117113311171116113311161115113311151114113311141113113311131112113311121111113311111110113311100f11330f0e11330e0d11330d0c11330c0b11330b0a11330a09113309113308070655405633db3c3e1132a4a69601fc113111321131113011311130112f1130112f112e112f112e112d112e112d112c112d112c112b112c112b112a112b112a1129112a1129112811291128112711281127112611271126112511261125112411251124112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d9700b0111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f0e0f550cdb310188702056238e1221c10a94205635b99170e2935323b99170e28e96563380202259f40e6fa192306ddf6eb3e300a401a401e857245f0356205631be93572070921120e211209901fc7080202056345422434133f40e6fa19401d70130925b6de280202056345422534133f40e6fa19401d70130925b6de280202056335422634133f40e6fa19401d70130925b6de280202056355422734133f40e6fa19401d70130925b6de270246eb3983003206ef2d080039134e270236eb3983002206ef2d080029133e2239a01ecc2639c02a76423a904c114927f34de9132e223b393206eb39170e29820206ef2d080c2009170e28e13f82301206ef2d080a18208278d00bc927f33de9130e222b39301c000923170e293206eb39170e29820206ef2d080c2009170e28e13f82301206ef2d080a18208093a80bc92307fde9130e2e3009b01fc113211361132113111351131113011341130112f1133112f112e1136112e112d1135112d112c1134112c112b1133112b112a1136112a112911351129112811341128112711331127112611361126112511351125112411341124112311331123112211361122112111351121112011341120111f1133111f111e1136111e9c01f8111d1135111d111c1134111c111b1133111b111a1136111a1119113511191118113411181117113311171116113611161115113511151114113411141113113311131112113611121111113511111110113411100f11330f0e11360e0d11350d0c11340c0b11330b0a11360a091135090811340807113307061136069d02fa051135050411340403113303021136020111350111345634db3c1136a4113211361132113111351131113011341130112f1133112f112e1132112e112d1131112d112c1130112c112b112f112b112a112e112a1129112d11291128112c11281127112b11271126112a11261125112911251124112811241123112711239eb003f4563080202259f40e6fa192306ddf2d80202383074133f40e6fa19401d70130925b6de2206eb38e23830701206ef2d08002112d026d8020216e955b59f45b3098c801cf014133f443e2112b9130e20d8020226d8307216e955b59f45b3098c801cf014133f443e22480202359f40f6fa192306ddf708a8ae85b049fa0a10014216eb39320c10a9170e2006e01206ef2d080d0d3ff24aa3f02a9383f12a0188307016d71216e955b59f45b3098c801cf004133f443e207d2000192d43092306de201a401fe8020226d206e953059f45b30944133f417e211318020226d206e953059f45b30944133f416e211308020226d71216e955b59f45b3098c801cf004133f443e280206d21031132032459216e955b59f45b3098c801cf014133f443e280206d21031131032459216e955b59f45b3098c801cf014133f443e280206d2103113003a201be2459216e955b59f45b3098c801cf014133f443e280206d2104112f04102302112f02216e955b59f45b3098c801cf014133f443e22c6eb3913ce30d112e112f112e112d112e112d112c112d112c112b112c112b112a112b112a0b112a0b102ba303fc70209b21561cb99320c1149170e28ed2562280202359f40e6fa192306ddf561e802024784133f40e6fa19401d70130925b6de2216eb39f01206ef2d0805610206ef2d080c705923170e293206eb39170e297206ef2d080c000923070e2e30001a401e85b70209b215613b99320c11e9170e28ae85b81010b0d206ef2d080a4aeaf01f4113211351132113111341131113011331130112f1134112f112e1133112e112d1134112d112c1133112c112b1134112b02112a02112911331129112811341128021127021126113311261125113411250211240211231133112311221134112202112102112011331120111f1134111f02111e02111d1133111da502fe111c1134111c02111b02111a1133111a111911341119021118021117113311171116113411160211150211141133111411131134111302111202111111331111111011341110102f0e11330e0d11340d102c105b0a11340a10291058071134071026041134041023021135020111340111355634db3c1135a4113211351132a6ac02d0561b802022784133f40e6fa19401d70130925b6de2206e92307f97206ef2d080c300e29130e0562080202259f40e6fa192306ddf111c8020227478216e955b59f45b3098c801cf014133f443e2561c6eb392571ce30d70209b215613b99320c1149170e28ae85f03a7ab01fe111c206ef2d080113311341133113211341132113111341131113011341130112f1134112f112e1134112e112d1134112d112c1134112c112b1134112b112a1134112a112911341129112811341128112711341127112611341126112511341125112411341124112311341123112211341122112111341121112011341120a801f8111f1134111f111e1134111e111d1134111d111c1134111c111b1134111b111a1134111a1119113411191118113411181117113411171116113411161115113411151114113411141113113411131112113411121111113411111110113411100f11340f0e11340e0d11340d0c11340c0b11340b0a11340a09113409a902f80811340807113407061134060511340504113404031134030211340201113401db3c113211331132113111321131113011311130112f1130112f112e112f112e112d112e112d112c112d112c112b112c112b112a112b112a1129112a1129112811291128112711281127112611271126112511261125112411251124cdaa00fc112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111b111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550e00e280202056195422434133f40e6fa19401d70130925b6de25615802024784133f40e6fa19401d70130925b6de2216eb39801206ef2d08024ba923170e293206eb39170e297206ef2d080c000923070e28e1c11148020227378216e955b59f45b3098c801cf014133f443e21114a4de01a40101f811311134113111301133113002113202112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b1129112c11291128112b11281127112a1127112611291126112511281125112411271124112311261123112211251122112111241121112011231120111f1122111f111e1121111e111d1120111dad00dc111c111f111c111b111e111b111a111d111a1119111c11191118111b11181117111a11171116111911161115111811151114111711141113111611131112111511121111111411111110111311100f11120f0e11110e0d11100d10cf10ad109c108b107a10691058104710365e2100de561880202359f40e6fa192306ddf5615802024784133f40e6fa19401d70130925b6de2216eb39f01206ef2d0805610206ef2d080c705923170e293206eb39170e297206ef2d080c000923070e28e1c11148020227378216e955b59f45b3098c801cf014133f443e21114a4de01a40100324fd06d810101216e955b59f4593098c801cf004133f441e20d01fc112211261122112111251121112011241120111f1123111f111e1122111e111d1121111d111c1120111c111b111f111b111a111e111a1119111d11191118111c11181117111b11171116111a11161115111911151114111811141113111711131112111611121111111511111110111411100f11130f0e11120e0d11110db100340c11100c10bf10ae109d108c107b106a1059104810374016505402928208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0001d2d8043ce3022182103785158dbae3022182101ce33d8ebae3022182103b9b249ebab4bac0ca01fe31d31ffa00d31fd430d0561c802025784133f40e6fa19401d70130925b6de2813404216eb3f2f481680001206ef2d080c000f2f4802020561f5422634133f40e6fa19401d70130925b6de28200bc90216eb39af82302206ef2d08012b9923170e2f2f4561e8020258101014133f40e6fa19401d70030925b6de282008b7321b501fc6eb39901206ef2d0805240bb923170e2f2f4562180202559f40e6fa192306ddf820087fa216eb39cf84202206ef2d08012c705b3923170e2f2f48020f84202111902561301206e953059f45b30944133f416e28020200211180256135262216e955b59f45b3098c801cf014133f443e20111150180200156125004810101b601fe216e955b59f45b3098c801cf004133f443e28020200311150312561202111701216e955b59f45b3098c801cf014133f443e21111802056107078216e955b59f45b3098c801cf014133f443e28020c8011117cf16c90211110201111601561001206e953059f45b30944133f417e22ea4248020561259f40f6fa192306ddfc8b703fc01111101cb1f56106eb39f7101cb001110206ef2d080011110cc98571070011110cb00e2802001c910351201111101206e953059f45b30944133f417e2113182087a1200a0205633a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf818ae2d2c7b801fcf400c901fb00113011321130112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b11291128112a1128112711291127112611281126112511271125112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111db901d0111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141112111511121110111411101111111311110f11120f0e11100e10df10ce10bd10ac109b108a107910681057104650030504d801fa31d31f305610802022784133f40e6fa19401d70130925b6de28200c723216eb3f2f48200b1bf01206ef2d080c000f2f480202056155422334133f40e6fa19401d70130925b6de282009d3e216eb3f2f4802021206ef2d08056215959f40e6fa192306ddf815730216eb39af84222206ef2d080c7059170e2f2f4802022bb01fa206ef2d080561d59784133f40e6fa19401d70130925b6de2816800216eb39801206ef2d080c000923170e2f2f4802022206ef2d08021561f55204133f40e6fa19401d70130925b6de28200bc90216eb39af82302206ef2d08012b9923170e2f2f411128020237178216e955b59f45b3098c801cf014133f443e2802022bc02f8206ef2d08002111d027178216e955b59f45b3098c801cf014133f443e2802022206ef2d0802103111d035250216e955b59f45b3098c801cf014133f443e256126eb38eaf1112206ef2d080111a111b111a1112111a11120211340201113501db3c1134011133011111111a1111111111191111925712e2206ef2d080cdbd01fc113211341132113111331131113011321130112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b11291128112a1128112711291127112611281126112511271125112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111ebe02fe111d111f111d111c111e111c111b111d111b1119111c11191111111b11111118111a11181117111911171116111811161115111711151114111611141113111511131112111411121112111311121110111211100f11110f0e11100e10df10ce10bd10ac109b108a107910681057104610354400db3c0182082dc6c0a05301d0bf0294a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0001d2d801ec31d31fd30730561a802023784133f40e6fa19401d70130925b6de2813404216eb3f2f482009b6f01206ef2d080c001f2f4561f80202359f40e6fa192306ddf815730216eb39af84222206ef2d080c7059170e2f2f4111b8020237278216e955b59f45b3098c801cf014133f443e2802020561c035055c104fa4133f40e6fa19401d70130925b6de2206eb38e9d802001206ef2d08056175959f40e6fa192306ddf206eb3935b5719e30d935b5719e2113182087a1200a0205633a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf818ae2f400c901fb00c2d2c7c802fc8020111c206ef2d080102b01111c015270206e953059f45b30944133f416e28020561b206ef2d08027103b01206e953059f45b30944133f416e2078020267071216e955b59f45b3098c801cf004133f443e2068020267071216e955b59f45b3098c801cf004133f443e205a47094205632b98ae830395719106710561045c3c6014e563080202259f40e6fa192306ddf206eb39e206ef2d080561c206ef2d080c705923070e2e300a4c401de80202056305422334133f40e6fa19401d70130925b6de270216eb39630206ef2d0809131e2802001a42103113103563159216e955b59f45b3098c801cf014133f443e22ac231e3008020f8232104112e04102302113102216e955b59f45b3098c801cf014133f443e2563001112b01c5008c802020562f595631014133f40e6fa19401d70130925b6de270216eb39630206ef2d0809131e2802001a42103113003563159216e955b59f45b3098c801cf014133f443e2112d00041034001a58cf8680cf8480f400f400cf8101fc113011321130112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b11291128112a1128112711291127112611281126112511271125112411261124112311251123112211241122112111231121112011221120111f1121111f111e1120111e111d111f111d111c111e111cc901d2111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035440302d802fe8efd31d31f305619802022784133f40e6fa19401d70130925b6de2813404216eb3f2f48200cd2501206ef2d080c000f2f4561e80202259f40e6fa192306ddf815730216eb39bf84202206ef2d08012c705923170e2f2f411198020561a7378216e955b59f45b3098c801cf014133f443e2f842113211331132113111321131cbd401fc113011311130112f1130112f112e112f112e112d112e112d112c112d112c112b112c112b112a112b112a1129112a1129112811291128112711281127112611271126112511261125112411251124112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111ccc02f8111b111c111b01111b011119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f10ef10de10cd10bc10ab109a108910781067105610451034413001113401db3c113211331132113111321131113011311130cdce00a02e81010b228101014133f40a6fa19401d70030925b6de2206eb39820206ef2d080c2009170e28e2581010b01206ef2d080a50311100312810101216e955b59f4593098c801cf004133f441e20d915be201fc112f1130112f112e112f112e112d112e112d112c112d112c112b112c112b112a112b112a1129112a1129112811291128112711281127112611271126112511261125112411251124112311241123112211231122112111221121112011211120111f1120111f111e111f111e111d111e111d111c111d111c111b111c111bcf03fe111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550e7fdb3c0182082dc6c0a05301a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf4002d0d2d3013c802054471359f40f6fa192306ddf709a216eb39320c1329170e28ae85f03d100ca01206ef2d080d0d31f5313bd8e485615802023784133f40e6fa19401d70130925b6de2206eb397206ef2d080c000923070e28e1f0111150180200111167278216e955b59f45b3098c801cf014133f443e211149131e29131e2d2000192d43092306de201a400140000000045786365737301e65c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0001c87f01ca001133113211311130112f112e112d112c112b112a1129112811271126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54d9012ce0018210946a98b6bae3025f0f5f0f5f0f5f07f2c082d501fad33f30c8018210aff90f5758cb1fcb3fc9113111331131113011321130112f1131112f112e1130112e112d112f112d112c112e112c112b112d112b112a112c112a1129112b11291128112a1128112711291127112611281126112511271125112411261124112311251123112211241122112111231121112011221120d601fc111f1121111f111e1120111e111d111f111d111c111e111c111b111d111b111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035d701ca4430f84270f8276f10f8416f24135f03a1820afaf080b98e29820afaf08070fb0270500381008201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb008e20705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00e2d801a8c87f01ca001133113211311130112f112e112d112c112b112a1129112811271126112511241123112211211120111f111e111d111c111b111a111911181117111611151114111311121111111055e0db3cc9ed54d901f6011132011133ce011130fa0201112e01cb1f01112c01f400112ac8f40001112901f40001112701f4001125c8f40001112401f40001112201f4001120c8f40001111f01f40001111d01f400111bc8f40001111a01f40001111801f4001116c8f40001111501cb1f01111301cb1f01111101f4001ff4000dc8f4001cda00eef4001af40008c8f40017f40015cb1f13f40001c8f40012f40012f40002c8f40014f40014f40005c8f40016cb1f16cb1f16f40017cb0717f40008c8f40019f4001af4000ac8f4001cf4001ccb1f1df4000dc8f4001ef400500efa02500efa021acd13cd1bcd18cd12cd18cd14cd12cd12cd13cdcd12cdcdf8e232a4');
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
    6483: { message: "Unknown escrow contract" },
    7126: { message: "Not the agent owner" },
    7480: { message: "Max intents reached. Cancel or wait for expiration." },
    7992: { message: "Deal not found" },
    13316: { message: "Intent not found" },
    19484: { message: "Not authorized to rate from this deal" },
    22320: { message: "Not the intent owner" },
    22978: { message: "Budget must be positive" },
    24749: { message: "Insufficient fee. Send at least 0.01 TON." },
    26624: { message: "Intent not open" },
    26825: { message: "Only owner can withdraw" },
    27854: { message: "Agent not found" },
    31510: { message: "Only the agent owner can update" },
    33966: { message: "Already rated in this deal" },
    34810: { message: "Cannot offer on own intent" },
    35699: { message: "Price exceeds budget" },
    38820: { message: "Only the agent owner can update availability" },
    39791: { message: "Intent not in accepted state" },
    40254: { message: "Offer has no intent" },
    40636: { message: "Nothing to withdraw" },
    43414: { message: "Already indexed" },
    45503: { message: "Offer not pending" },
    45692: { message: "Only owner can register escrows" },
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
    "Unknown escrow contract": 6483,
    "Not the agent owner": 7126,
    "Max intents reached. Cancel or wait for expiration.": 7480,
    "Deal not found": 7992,
    "Intent not found": 13316,
    "Not authorized to rate from this deal": 19484,
    "Not the intent owner": 22320,
    "Budget must be positive": 22978,
    "Insufficient fee. Send at least 0.01 TON.": 24749,
    "Intent not open": 26624,
    "Only owner can withdraw": 26825,
    "Agent not found": 27854,
    "Only the agent owner can update": 31510,
    "Already rated in this deal": 33966,
    "Cannot offer on own intent": 34810,
    "Price exceeds budget": 35699,
    "Only the agent owner can update availability": 38820,
    "Intent not in accepted state": 39791,
    "Offer has no intent": 40254,
    "Nothing to withdraw": 40636,
    "Already indexed": 43414,
    "Offer not pending": 45503,
    "Only owner can register escrows": 45692,
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
    {"name":"Rate","header":1335410632,"fields":[{"name":"agentName","type":{"kind":"simple","type":"string","optional":false}},{"name":"success","type":{"kind":"simple","type":"bool","optional":false}},{"name":"dealIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"UpdateAvailability","header":1424124491,"fields":[{"name":"name","type":{"kind":"simple","type":"string","optional":false}},{"name":"available","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"Withdraw","header":593874976,"fields":[]},
    {"name":"IndexCapability","header":344274104,"fields":[{"name":"agentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"capabilityHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"TriggerCleanup","header":2266087279,"fields":[{"name":"maxClean","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"RegisterEscrow","header":237020056,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"NotifyDisputeOpened","header":796807257,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"depositor","type":{"kind":"simple","type":"address","optional":false}},{"name":"beneficiary","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"votingDeadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"NotifyDisputeSettled","header":3214956934,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"released","type":{"kind":"simple","type":"bool","optional":false}},{"name":"refunded","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"BroadcastIntent","header":1767312928,"fields":[{"name":"serviceHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"serviceName","type":{"kind":"simple","type":"string","optional":false}},{"name":"budget","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"description","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"SendOffer","header":2507343683,"fields":[{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"price","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deliveryTime","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"endpoint","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"AcceptOffer","header":931468685,"fields":[{"name":"offerIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"CancelIntent","header":1000023198,"fields":[{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"SettleDeal","header":484654478,"fields":[{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"rating","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"AgentData","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"available","type":{"kind":"simple","type":"bool","optional":false}},{"name":"totalTasks","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"successes","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"registeredAt","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"DisputeInfo","header":null,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"depositor","type":{"kind":"simple","type":"address","optional":false}},{"name":"beneficiary","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"votingDeadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"settled","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"AgentCleanupInfo","header":null,"fields":[{"name":"index","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"exists","type":{"kind":"simple","type":"bool","optional":false}},{"name":"score","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"totalRatings","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"registeredAt","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"lastActive","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"daysSinceActive","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"daysSinceRegistered","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"eligibleForCleanup","type":{"kind":"simple","type":"bool","optional":false}},{"name":"cleanupReason","type":{"kind":"simple","type":"uint","optional":false,"format":8}}]},
    {"name":"IntentData","header":null,"fields":[{"name":"buyer","type":{"kind":"simple","type":"address","optional":false}},{"name":"serviceHash","type":{"kind":"simple","type":"uint","optional":false,"format":256}},{"name":"serviceName","type":{"kind":"simple","type":"string","optional":false}},{"name":"budget","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"status","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"acceptedOffer","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"isExpired","type":{"kind":"simple","type":"bool","optional":false}},{"name":"description","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"OfferData","header":null,"fields":[{"name":"seller","type":{"kind":"simple","type":"address","optional":false}},{"name":"intentIndex","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"price","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deliveryTime","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"status","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"endpoint","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"StorageInfo","header":null,"fields":[{"name":"storageFund","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"totalCells","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"annualCost","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"yearsCovered","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"Reputation$Data","header":null,"fields":[{"name":"owner","type":{"kind":"simple","type":"address","optional":false}},{"name":"fee","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"agentCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"agentOwners","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"agentAvailable","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"bool"}},{"name":"agentTotalTasks","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"agentSuccesses","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"agentRegisteredAt","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"agentLastActive","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"nameToIndex","type":{"kind":"dict","key":"uint","keyFormat":256,"value":"uint","valueFormat":32}},{"name":"capabilityIndex","type":{"kind":"dict","key":"uint","keyFormat":256,"value":"cell","valueFormat":"ref"}},{"name":"openDisputes","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"disputeDepositors","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"disputeBeneficiaries","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"disputeAmounts","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"int"}},{"name":"disputeDeadlines","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"disputeSettled","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"bool"}},{"name":"disputeCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"cleanupCursor","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"intents","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"intentServiceHashes","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":256}},{"name":"intentServiceNames","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"cell","valueFormat":"ref"}},{"name":"intentBudgets","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"int"}},{"name":"intentDeadlines","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"intentStatuses","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":8}},{"name":"intentAcceptedOffer","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"intentCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"intentsByService","type":{"kind":"dict","key":"uint","keyFormat":256,"value":"cell","valueFormat":"ref"}},{"name":"intentDescriptions","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"cell","valueFormat":"ref"}},{"name":"offers","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"offerIntents","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"offerPrices","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"int"}},{"name":"offerDeliveryTimes","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":32}},{"name":"offerStatuses","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":8}},{"name":"offerEndpoints","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"cell","valueFormat":"ref"}},{"name":"offerCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"intentCleanupCursor","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"agentActiveIntents","type":{"kind":"dict","key":"address","value":"int"}},{"name":"maxIntentsPerAgent","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"agentNameHashes","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"uint","valueFormat":256}},{"name":"knownEscrows","type":{"kind":"dict","key":"address","value":"bool"}},{"name":"dealBuyers","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"dealSellers","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"address"}},{"name":"dealBuyerRated","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"bool"}},{"name":"dealSellerRated","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"bool"}},{"name":"dealCount","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"intentOffers","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"cell","valueFormat":"ref"}},{"name":"agentCapIndexed","type":{"kind":"dict","key":"uint","keyFormat":256,"value":"bool"}},{"name":"agentIndexedCaps","type":{"kind":"dict","key":"uint","keyFormat":32,"value":"cell","valueFormat":"ref"}},{"name":"storageFund","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"accumulatedFees","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
]

const Reputation_opcodes = {
    "Deploy": 2490013878,
    "DeployOk": 2952335191,
    "FactoryDeploy": 1829761339,
    "Register": 950051591,
    "Rate": 1335410632,
    "UpdateAvailability": 1424124491,
    "Withdraw": 593874976,
    "IndexCapability": 344274104,
    "TriggerCleanup": 2266087279,
    "RegisterEscrow": 237020056,
    "NotifyDisputeOpened": 796807257,
    "NotifyDisputeSettled": 3214956934,
    "BroadcastIntent": 1767312928,
    "SendOffer": 2507343683,
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
    {"name":"dealCount","methodId":108804,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
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
    'dealCount': 'getDealCount',
    'storageFundBalance': 'getStorageFundBalance',
    'accumulatedFeesBalance': 'getAccumulatedFeesBalance',
}

const Reputation_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"Register"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Rate"}},
    {"receiver":"internal","message":{"kind":"typed","type":"UpdateAvailability"}},
    {"receiver":"internal","message":{"kind":"typed","type":"IndexCapability"}},
    {"receiver":"internal","message":{"kind":"typed","type":"TriggerCleanup"}},
    {"receiver":"internal","message":{"kind":"typed","type":"RegisterEscrow"}},
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
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: Register | Rate | UpdateAvailability | IndexCapability | TriggerCleanup | RegisterEscrow | NotifyDisputeOpened | NotifyDisputeSettled | Withdraw | BroadcastIntent | SendOffer | AcceptOffer | SettleDeal | CancelIntent | Deploy) {
        
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
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'RegisterEscrow') {
            body = beginCell().store(storeRegisterEscrow(message)).endCell();
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
    
    async getDealCount(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('dealCount', builder.build())).stack;
        const result = source.readBigNumber();
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